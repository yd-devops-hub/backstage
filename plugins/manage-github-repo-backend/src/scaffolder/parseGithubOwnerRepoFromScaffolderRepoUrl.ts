import { InputError } from '@backstage/errors';
import type { ScmIntegrations } from '@backstage/integration';
import { parseRepoUrl } from '@backstage/plugin-scaffolder-node';

/**
 * Supports:
 * - RepoUrlPicker form: `github.com?owner=org&repo=name`
 * - HTTPS remote URLs from `publish:github`: `https://github.com/org/repo.git`
 *
 * `parseRepoUrl` only accepts the first form (it prefixes `https://` internally).
 */
export function parseGithubOwnerRepoFromScaffolderRepoUrl(
  repoUrl: string,
  integrations: ScmIntegrations,
): { owner: string; repo: string } {
  const raw = repoUrl.trim();
  if (!raw.length) {
    throw new InputError('repoUrl is empty');
  }

  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new InputError(`Invalid repo URL: ${repoUrl}`);
    }
    const host = url.hostname;
    if (!integrations.byHost(host)) {
      throw new InputError(
        `No matching integration configuration for host ${host}, please check your integrations config`,
      );
    }
    const segments = url.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean);
    if (segments.length < 2) {
      throw new InputError(
        `Could not parse owner and repo from URL path: ${url.pathname}`,
      );
    }
    const repo = segments.pop()!.replace(/\.git$/i, '');
    const owner = segments.join('/');
    return { owner, repo };
  }

  const parsed = parseRepoUrl(raw, integrations);
  const owner = parsed.owner ?? parsed.organization;
  const repo = parsed.repo?.replace(/\.git$/i, '');
  if (!owner?.trim() || !repo?.trim()) {
    throw new InputError(
      `Could not parse owner and repo from repoUrl: ${repoUrl}`,
    );
  }
  return { owner: owner.trim(), repo: repo.trim() };
}
