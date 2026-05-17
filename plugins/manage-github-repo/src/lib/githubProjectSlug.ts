import type { Entity } from '@backstage/catalog-model';

/**
 * Standard annotation for linking a catalog entity to a GitHub repo,
 * formatted as `{owner}/{repo}` (same as GitHub Actions and many Backstage integrations).
 *
 * @see https://backstage.io/docs/integrations/github/discovery/#configuration
 */
export const GITHUB_PROJECT_SLUG_ANNOTATION = 'github.com/project-slug';

export function parseGithubProjectSlug(
  entity: Entity,
): { owner: string; repo: string } | undefined {
  const raw =
    entity.metadata.annotations?.[GITHUB_PROJECT_SLUG_ANNOTATION]?.trim();
  if (!raw) return undefined;

  const parts = raw.split('/').filter(Boolean);
  if (parts.length !== 2) return undefined;

  const [owner, repo] = parts;
  if (!owner.length || !repo.length) return undefined;

  return { owner, repo };
}
