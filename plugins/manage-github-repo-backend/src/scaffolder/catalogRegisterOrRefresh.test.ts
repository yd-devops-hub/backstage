import { ResponseError } from '@backstage/errors';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import { ScmIntegrations } from '@backstage/integration';
import { ConfigReader } from '@backstage/config';
import type { Entity } from '@backstage/catalog-model';

import { createCatalogRegisterOrRefreshAction } from './catalogRegisterOrRefresh';

jest.useFakeTimers();

type ActionHandler = ReturnType<
  typeof createCatalogRegisterOrRefreshAction
>['handler'];

type CatalogServiceMock = {
  addLocation: jest.Mock;
} & Partial<CatalogService>;

function buildCatalogMock(): CatalogServiceMock {
  return { addLocation: jest.fn() };
}

function buildIntegrations(): ScmIntegrations {
  return ScmIntegrations.fromConfig(
    new ConfigReader({
      integrations: {
        github: [{ host: 'github.com', token: 'fake-token' }],
      },
    }),
  );
}

type LoggerMock = {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
  child: jest.Mock;
};

function buildLogger(): LoggerMock {
  const logger: LoggerMock = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(),
  };
  logger.child.mockReturnValue(logger);
  return logger;
}

type CtxOverrides = {
  input: Record<string, unknown>;
  logger?: LoggerMock;
  credentials?: object;
};

function buildCtx(overrides: CtxOverrides) {
  const logger = overrides.logger ?? buildLogger();
  const credentials = overrides.credentials ?? { principal: { type: 'user' } };
  const outputs: Record<string, unknown> = {};

  const ctx = {
    input: overrides.input,
    logger,
    workspacePath: '/tmp/workspace',
    output: jest.fn((name: string, value: unknown) => {
      outputs[name] = value;
    }),
    getInitiatorCredentials: jest.fn().mockResolvedValue(credentials),
    checkpoint: jest.fn(),
    createTemporaryDirectory: jest.fn(),
    task: { id: 'test-task' },
  };

  return { ctx, logger, outputs };
}

function buildResponseError(opts: {
  status: number;
  statusText?: string;
  causeMessage?: string;
}): ResponseError {
  const response = new Response(
    JSON.stringify({
      error: {
        name: 'InputError',
        message: opts.causeMessage ?? 'Synthetic test error',
      },
      request: { method: 'POST', url: 'http://catalog/locations' },
      response: { statusCode: opts.status },
    }),
    {
      status: opts.status,
      statusText: opts.statusText ?? 'Bad Request',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  // ResponseError.fromResponse is async; we expose a sync helper by using
  // Object.assign on a freshly-constructed error so tests stay simple.
  const err = Object.assign(new Error(`Request failed with ${opts.status}`), {
    name: 'ResponseError',
    statusCode: opts.status,
    statusText: opts.statusText ?? 'Bad Request',
    response,
    body: undefined,
    cause: opts.causeMessage
      ? Object.assign(new Error(opts.causeMessage), { name: 'InputError' })
      : undefined,
  });
  Object.setPrototypeOf(err, ResponseError.prototype);
  return err as unknown as ResponseError;
}

async function runAndAdvanceTimers(promise: Promise<void>): Promise<void> {
  await Promise.race([
    promise.catch(() => {
      /* swallow for advance loop; final state checked by caller */
    }),
    (async () => {
      for (let i = 0; i < 50; i++) {
        await Promise.resolve();
        jest.advanceTimersByTime(20_000);
      }
    })(),
  ]);
}

describe('createCatalogRegisterOrRefreshAction', () => {
  const githubBlobUrl =
    'https://github.com/yd-devops-hub/test-backstage-repo/blob/main/catalog-info.yaml';
  const githubTreeUrl =
    'https://github.com/yd-devops-hub/test-backstage-repo/tree/main/catalog-info.yaml';
  const repoContentsUrl =
    'https://github.com/yd-devops-hub/test-backstage-repo/blob/main';

  function makeAction(catalog: CatalogServiceMock) {
    return createCatalogRegisterOrRefreshAction({
      catalog: catalog as unknown as CatalogService,
      integrations: buildIntegrations(),
    });
  }

  describe('URL resolution', () => {
    it('normalizes a GitHub blob URL to the canonical tree form', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [
            { kind: 'Component', metadata: { name: 'test' } } as Entity,
          ],
        })
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        });

      const action = makeAction(catalog);
      const { ctx, outputs } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await (action.handler as ActionHandler)(ctx as never);

      expect(outputs.catalogInfoUrl).toBe(githubTreeUrl);
      expect(catalog.addLocation.mock.calls[0][0]).toEqual({
        dryRun: true,
        type: 'url',
        target: githubTreeUrl,
      });
      expect(catalog.addLocation.mock.calls[1][0]).toEqual({
        type: 'url',
        target: githubTreeUrl,
        onConflict: 'refresh',
      });
    });

    it('resolves repoContentsUrl + catalogInfoPath via the matching integration', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation.mockResolvedValue({
        location: { type: 'url', target: githubTreeUrl },
        entities: [
          { kind: 'Component', metadata: { name: 'svc' } } as Entity,
        ],
      });

      const action = makeAction(catalog);
      const { ctx, outputs } = buildCtx({
        input: { repoContentsUrl, catalogInfoPath: '/catalog-info.yaml' },
      });

      await (action.handler as ActionHandler)(ctx as never);

      expect(outputs.catalogInfoUrl).toBe(githubTreeUrl);
    });

    it('falls back to /catalog-info.yaml when catalogInfoPath is omitted', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation.mockResolvedValue({
        location: { type: 'url', target: githubTreeUrl },
        entities: [],
      });

      const action = makeAction(catalog);
      const { ctx, outputs } = buildCtx({
        input: { repoContentsUrl },
      });

      await (action.handler as ActionHandler)(ctx as never);

      expect(outputs.catalogInfoUrl).toBe(githubTreeUrl);
    });

    it('throws InputError when repoContentsUrl host has no integration', async () => {
      const catalog = buildCatalogMock();
      const action = makeAction(catalog);
      const { ctx } = buildCtx({
        input: { repoContentsUrl: 'https://unknown-host.example.com/x/y' },
      });

      await expect(
        (action.handler as ActionHandler)(ctx as never),
      ).rejects.toThrow(/No integration found for host/);
    });
  });

  describe('entity ref selection', () => {
    it('prefers a non-generated Component', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [
            { kind: 'Location', metadata: { name: 'generated-abc' } } as Entity,
            { kind: 'System', metadata: { name: 'svc-system' } } as Entity,
            { kind: 'Component', metadata: { name: 'svc' } } as Entity,
          ],
        })
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        });

      const action = makeAction(catalog);
      const { ctx, outputs } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await (action.handler as ActionHandler)(ctx as never);

      expect(outputs.entityRef).toBe('component:default/svc');
    });

    it('falls back to a non-generated entity when no Component exists', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [
            { kind: 'Location', metadata: { name: 'generated-abc' } } as Entity,
            { kind: 'System', metadata: { name: 'svc-system' } } as Entity,
          ],
        })
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        });

      const action = makeAction(catalog);
      const { ctx, outputs } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await (action.handler as ActionHandler)(ctx as never);

      expect(outputs.entityRef).toBe('system:default/svc-system');
    });

    it('does not set entityRef when the dry-run returns no entities', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        })
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        });

      const action = makeAction(catalog);
      const { ctx, outputs } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await (action.handler as ActionHandler)(ctx as never);

      expect(outputs.entityRef).toBeUndefined();
    });
  });

  describe('persistence and conflict handling', () => {
    it('always passes onConflict=refresh when persisting the location', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        })
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        });

      const action = makeAction(catalog);
      const { ctx } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await (action.handler as ActionHandler)(ctx as never);

      expect(catalog.addLocation.mock.calls[1][0]).toMatchObject({
        type: 'url',
        target: githubTreeUrl,
        onConflict: 'refresh',
      });
    });

    it('runs dry-run before persisting so a broken URL is never stored', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation.mockRejectedValueOnce(
        buildResponseError({
          status: 400,
          causeMessage: 'Entity envelope failed validation',
        }),
      );

      const action = makeAction(catalog);
      const { ctx } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await expect(
        (action.handler as ActionHandler)(ctx as never),
      ).rejects.toThrow(/Entity envelope failed validation/);

      expect(catalog.addLocation).toHaveBeenCalledTimes(1);
      expect(catalog.addLocation.mock.calls[0][0]).toMatchObject({
        dryRun: true,
      });
    });
  });

  describe('retry behavior', () => {
    it('retries transient eventual-consistency 400s with backoff and eventually succeeds', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation
        .mockRejectedValueOnce(
          buildResponseError({
            status: 400,
            causeMessage:
              'Unable to read url, NotFoundError: not found at /catalog-info.yaml',
          }),
        )
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [
            { kind: 'Component', metadata: { name: 'svc' } } as Entity,
          ],
        })
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        });

      const action = makeAction(catalog);
      const { ctx, logger, outputs } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await runAndAdvanceTimers(
        (action.handler as ActionHandler)(ctx as never),
      );

      expect(catalog.addLocation).toHaveBeenCalledTimes(3);
      expect(outputs.entityRef).toBe('component:default/svc');
      const warnings = logger.warn.mock.calls.map(c => c[0]).join('\n');
      const errors = logger.error.mock.calls.map(c => c[0]).join('\n');
      expect(warnings).toMatch(/Retrying catalog registration .* in \d+ms/);
      expect(errors).toMatch(/attempt 1\/6 failed/);
      expect(errors).toMatch(/not found/i);
    });

    it('retries on 5xx server errors', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation
        .mockRejectedValueOnce(
          buildResponseError({
            status: 503,
            statusText: 'Service Unavailable',
            causeMessage: 'Backend temporarily unavailable',
          }),
        )
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        })
        .mockResolvedValueOnce({
          location: { type: 'url', target: githubTreeUrl },
          entities: [],
        });

      const action = makeAction(catalog);
      const { ctx } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await runAndAdvanceTimers(
        (action.handler as ActionHandler)(ctx as never),
      );

      expect(catalog.addLocation).toHaveBeenCalledTimes(3);
    });

    it('does not retry a 400 with a non-transient cause but still logs the cause', async () => {
      const catalog = buildCatalogMock();
      const error = buildResponseError({
        status: 400,
        causeMessage:
          'Policy check failed: spec.owner must reference an existing entity',
      });
      catalog.addLocation.mockRejectedValueOnce(error);

      const action = makeAction(catalog);
      const { ctx, logger } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      await expect(
        (action.handler as ActionHandler)(ctx as never),
      ).rejects.toThrow(/Policy check failed/);

      expect(catalog.addLocation).toHaveBeenCalledTimes(1);
      const warnings = logger.warn.mock.calls.map(c => c[0]).join('\n');
      const errors = logger.error.mock.calls.map(c => c[0]).join('\n');
      expect(warnings).not.toMatch(/Retrying/);
      expect(errors).toMatch(/Policy check failed/);
    });

    it('eventually throws after exhausting all retries', async () => {
      const catalog = buildCatalogMock();
      const error = buildResponseError({
        status: 400,
        causeMessage: 'Unable to read url, NotFoundError: not found',
      });
      catalog.addLocation.mockRejectedValue(error);

      const action = makeAction(catalog);
      const { ctx, logger } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl },
      });

      const handlerPromise = (action.handler as ActionHandler)(
        ctx as never,
      ).catch(e => e);

      await runAndAdvanceTimers(handlerPromise as Promise<void>);
      const result = (await handlerPromise) as Error & { cause?: unknown };

      // The handler wraps the final ResponseError so the workflow runner's
      // stack-trace log carries the underlying cause as the message.
      expect(result).toBeInstanceOf(Error);
      expect(result.name).toBe('CatalogRegisterOrRefreshError');
      expect(result.cause).toBe(error);
      expect(result.message).toMatch(/Catalog registration failed for/);
      expect(result.message).toMatch(/not found/i);
      // The action attempts 6 times in total.
      expect(catalog.addLocation).toHaveBeenCalledTimes(6);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/attempt 6\/6/),
      );
    });

    it('swallows the final error when optional=true', async () => {
      const catalog = buildCatalogMock();
      catalog.addLocation.mockRejectedValueOnce(
        buildResponseError({
          status: 400,
          causeMessage: 'Policy check failed',
        }),
      );

      const action = makeAction(catalog);
      const { ctx, logger } = buildCtx({
        input: { catalogInfoUrl: githubBlobUrl, optional: true },
      });

      await expect(
        (action.handler as ActionHandler)(ctx as never),
      ).resolves.toBeUndefined();

      const warnings = logger.warn.mock.calls.map(c => c[0]).join('\n');
      const errors = logger.error.mock.calls.map(c => c[0]).join('\n');
      expect(warnings).toMatch(/optional=true/);
      // The cause is still surfaced via the error logger even when we suppress
      // the throw because optional=true.
      expect(errors).toMatch(/Policy check failed/);
    });
  });
});
