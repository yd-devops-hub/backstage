import type { RestEndpointMethodTypes } from '@octokit/rest';

/**
 * Body for create/update repository ruleset (no owner/repo path params).
 * Cast at the Octokit boundary because GitHub adds fields ahead of OpenAPI (e.g. RepositoryRole bypass).
 */
export type RepoRulesetUpsertPayload = Omit<
  RestEndpointMethodTypes['repos']['createRepoRuleset']['parameters'],
  'owner' | 'repo'
> & {
  /** Ruleset display name (required for upsert-by-name). */
  name: string;
};

/**
 * Default branch ruleset applied automatically when creating a repository via this plugin.
 * Uses `~DEFAULT_BRANCH` so it tracks whatever GitHub reports as the default branch.
 *
 * Aligns with org policy: branch deletion protection, no force-push, PR requirements,
 * merge methods, CODEOWNERS / last-push approval, and Admin bypass (RepositoryRole id 5).
 */
export const DEFAULT_REPO_CREATION_RULESET = {
  name: 'main',
  target: 'branch' as const,
  enforcement: 'active' as const,
  conditions: {
    ref_name: {
      exclude: [] as string[],
      include: ['~DEFAULT_BRANCH'],
    },
  },
  rules: [
    { type: 'deletion' as const },
    { type: 'non_fast_forward' as const },
    {
      type: 'pull_request' as const,
      parameters: {
        required_approving_review_count: 1,
        dismiss_stale_reviews_on_push: true,
        required_reviewers: [] as unknown[],
        require_code_owner_review: true,
        require_last_push_approval: true,
        required_review_thread_resolution: true,
        allowed_merge_methods: ['merge', 'squash', 'rebase'] as const,
      },
    },
  ],
  bypass_actors: [
    {
      actor_id: 5,
      actor_type: 'RepositoryRole',
      bypass_mode: 'always',
    },
  ],
} as RepoRulesetUpsertPayload;

export const DEFAULT_REPO_CREATION_RULESET_NAME =
  DEFAULT_REPO_CREATION_RULESET.name;
