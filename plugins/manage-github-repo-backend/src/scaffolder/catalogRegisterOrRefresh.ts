import { InputError, ResponseError } from '@backstage/errors';
import { stringifyEntityRef, type Entity } from '@backstage/catalog-model';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  type ScmIntegrations,
  replaceGithubUrlType,
} from '@backstage/integration';

/**
 * GitHub's contents API can briefly return 404 right after a push (eventual
 * consistency), branch protection rulesets can momentarily reject the file
 * read, and our own catalog backend can return 5xx during startup or while
 * pulling locations. We retry on those classes of failures with exponential
 * backoff capped at {@link CATALOG_REGISTER_MAX_DELAY_MS}.
 */
const CATALOG_REGISTER_MAX_ATTEMPTS = 6;
const CATALOG_REGISTER_INITIAL_DELAY_MS = 1500;
const CATALOG_REGISTER_MAX_DELAY_MS = 15000;

const RETRYABLE_LOCATION_ERROR_SNIPPETS = [
  'unable to read',
  'notfound',
  'not found',
  '404',
  'no matching files',
  'econnrefused',
  'econnreset',
  'etimedout',
  'temporarily unavailable',
  'no processor was able to handle',
] as const;

/**
 * Pulls every diagnostic the catalog backend returns out of a {@link ResponseError}:
 *   - the cause `message` (deserialized from the server's JSON `error.message`)
 *   - the cause `name` (the original error class, e.g. `InputError`)
 *   - the full response `body` (the JSON envelope, including request URL/method)
 *
 * The standard `ResponseError.message` is just `"Request failed with 400 Bad Request"`
 * which is useless on its own — this helper produces something diagnosable.
 */
function describeError(error: unknown): string {
  if (error instanceof ResponseError) {
    const cause = error.cause as
      | { name?: string; message?: string }
      | undefined;
    const causeText = cause?.message
      ? `${cause.name ? `${cause.name}: ` : ''}${cause.message}`
      : undefined;
    const bodyText = error.body ? safeStringify(error.body) : undefined;
    const parts = [error.message];
    if (causeText) parts.push(causeText);
    if (bodyText && (!causeText || !causeText.includes(bodyText))) {
      parts.push(`body=${bodyText}`);
    }
    return parts.join(' — ');
  }
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

function safeStringify(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    return json && json.length > 2000 ? `${json.slice(0, 2000)}…` : json ?? '';
  } catch {
    return String(value);
  }
}

function isRetriableCatalogRegistrationError(error: unknown): boolean {
  if (!(error instanceof ResponseError)) {
    // Network-level failures (fetch aborted, ECONNRESET, etc.) bubble up as
    // generic Errors and are worth retrying.
    return error instanceof Error;
  }
  // Always retry on transient server errors.
  if (error.statusCode >= 500 && error.statusCode <= 599) {
    return true;
  }
  // Only retry on 400 when the cause looks like the read couldn't find the
  // file yet (eventual consistency from GitHub's content API).
  if (error.statusCode !== 400) {
    return false;
  }
  const cause = (error.cause as { message?: string } | undefined)?.message ?? '';
  const bodyText = error.body ? safeStringify(error.body) : '';
  const text = `${error.message}\n${cause}\n${bodyText}`.toLowerCase();
  return RETRYABLE_LOCATION_ERROR_SNIPPETS.some(snippet => text.includes(snippet));
}

/**
 * Re-wraps a {@link ResponseError} so its `message` carries the cause/body
 * details. The scaffolder workflow runner only logs `error.message` + stack on
 * an unhandled rejection, so without this an operator sees nothing more than
 * `Request failed with 400 Bad Request`.
 */
function rethrowWithCause(error: unknown, catalogInfoUrl: string): never {
  if (error instanceof ResponseError) {
    const wrapped = new Error(
      `Catalog registration failed for ${catalogInfoUrl}: ${describeError(error)}`,
    );
    wrapped.name = 'CatalogRegisterOrRefreshError';
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
  throw error;
}

function computeBackoffMs(attempt: number): number {
  const exponential = CATALOG_REGISTER_INITIAL_DELAY_MS * 2 ** (attempt - 1);
  return Math.min(exponential, CATALOG_REGISTER_MAX_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Picks the most user-visible entity from a catalog dry-run result:
 *   1. The first non-generated Component (typical case for `catalog-info.yaml`).
 *   2. The first non-generated entity of any kind (Systems, APIs, …).
 *   3. The first entity returned by the catalog (always a Location otherwise).
 */
function pickPrimaryEntity(entities: Entity[]): Entity | undefined {
  if (entities.length === 0) return undefined;
  return (
    entities.find(
      e => e.kind === 'Component' && !e.metadata.name.startsWith('generated-'),
    ) ??
    entities.find(e => !e.metadata.name.startsWith('generated-')) ??
    entities[0]
  );
}

/**
 * Same behavior as the built-in `catalog:register` action, but:
 *
 *   1. Persists the location with `onConflict: 'refresh'` so template re-runs
 *      do not fail with HTTP 409 after the URL was already registered once.
 *   2. Normalizes GitHub catalog URLs to a single canonical form (the `tree`
 *      variant Backstage uses everywhere else) so the same `catalog-info.yaml`
 *      always hashes to the same Location entity ref.
 *   3. Retries transient failures (eventual GitHub consistency, 5xx from the
 *      catalog backend, network blips) with exponential backoff, surfacing the
 *      underlying server-side cause in the logs on every attempt.
 */
export function createCatalogRegisterOrRefreshAction(options: {
  catalog: CatalogService;
  integrations: ScmIntegrations;
}) {
  const { catalog, integrations } = options;

  return createTemplateAction({
    id: 'catalog:registerOrRefresh',
    description:
      'Like catalog:register, but refreshes an existing catalog location on conflict (409) instead of failing — suitable for repeatable templates.',
    schema: {
      input: z =>
        z.union([
          z.object({
            catalogInfoUrl: z
              .string()
              .describe('Absolute URL of the catalog-info.yaml file'),
            optional: z
              .boolean()
              .describe(
                'If true, registration failures are ignored. Default: false',
              )
              .optional(),
          }),
          z.object({
            repoContentsUrl: z
              .string()
              .describe('Absolute URL of the repository contents root'),
            catalogInfoPath: z
              .string()
              .describe(
                'Path relative to repo root; defaults to /catalog-info.yaml',
              )
              .optional(),
            optional: z
              .boolean()
              .describe(
                'If true, registration failures are ignored. Default: false',
              )
              .optional(),
          }),
        ]),
      output: z =>
        z.object({
          catalogInfoUrl: z.string(),
          entityRef: z.string().optional(),
        }),
    },
    async handler(ctx) {
      const { input } = ctx;
      const catalogInfoUrl = resolveCatalogInfoUrl(input, integrations);
      const credentials = await ctx.getInitiatorCredentials();

      ctx.output('catalogInfoUrl', catalogInfoUrl);

      for (let attempt = 1; attempt <= CATALOG_REGISTER_MAX_ATTEMPTS; attempt++) {
        ctx.logger.info(
          `Registering ${catalogInfoUrl} in the catalog (attempt ${attempt}/${CATALOG_REGISTER_MAX_ATTEMPTS})`,
        );

        try {
          // Validate the URL is reachable and extract entity refs in one shot.
          // The dry-run runs the full processing pipeline, so a failure here
          // means the catalog-info.yaml is not yet readable, fails policy, or
          // doesn't parse — exactly the cases we want to retry or surface.
          const { entities } = await catalog.addLocation(
            { dryRun: true, type: 'url', target: catalogInfoUrl },
            { credentials },
          );

          // Persist (or refresh) the location only after the URL passed the
          // dry-run validation, so we never store a broken location.
          await catalog.addLocation(
            {
              type: 'url',
              target: catalogInfoUrl,
              onConflict: 'refresh',
            },
            { credentials },
          );

          const primary = pickPrimaryEntity(entities);
          if (primary) {
            ctx.output('entityRef', stringifyEntityRef(primary));
          }
          return;
        } catch (error) {
          // ALWAYS surface the underlying cause before deciding to retry or
          // throw — `ResponseError.message` on its own is just
          // `"Request failed with 400 Bad Request"` and the workflow runner
          // logs only the thrown error, so without this the operator never
          // learns why the catalog rejected the location.
          const diagnostic = describeError(error);
          ctx.logger.error(
            `Catalog registration attempt ${attempt}/${CATALOG_REGISTER_MAX_ATTEMPTS} failed for ${catalogInfoUrl}: ${diagnostic}`,
          );

          const isLastAttempt = attempt >= CATALOG_REGISTER_MAX_ATTEMPTS;
          const shouldRetry =
            !isLastAttempt && isRetriableCatalogRegistrationError(error);

          if (!shouldRetry) {
            if (input.optional) {
              ctx.logger.warn(
                `Continuing past catalog registration failure because optional=true (${catalogInfoUrl})`,
              );
              return;
            }
            rethrowWithCause(error, catalogInfoUrl);
          }

          const delayMs = computeBackoffMs(attempt);
          ctx.logger.warn(
            `Retrying catalog registration for ${catalogInfoUrl} in ${delayMs}ms`,
          );
          await sleep(delayMs);
        }
      }
    },
  });
}

function resolveCatalogInfoUrl(
  input:
    | { catalogInfoUrl: string }
    | { repoContentsUrl: string; catalogInfoPath?: string },
  integrations: ScmIntegrations,
): string {
  let url: string;
  if ('catalogInfoUrl' in input) {
    url = input.catalogInfoUrl;
  } else {
    const { repoContentsUrl, catalogInfoPath = '/catalog-info.yaml' } = input;
    const integration = integrations.byUrl(repoContentsUrl);
    if (!integration) {
      throw new InputError(
        `No integration found for host ${repoContentsUrl}`,
      );
    }
    url = integration.resolveUrl({
      base: repoContentsUrl,
      url: catalogInfoPath,
    });
  }

  // Normalize GitHub URLs to the canonical `tree` form Backstage uses
  // everywhere else (GithubIntegration.resolveUrl produces `tree`, the
  // catalog backend reads either, the location entity name is hashed from the
  // URL so a stable canonical form prevents duplicate Location entities).
  const integration = integrations.byUrl(url);
  if (integration?.type === 'github') {
    url = replaceGithubUrlType(url, 'tree');
  }
  return url;
}
