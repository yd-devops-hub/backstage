import type { RepoRulesetUpsertPayload } from './defaultRepoCreationRuleset';

export type BranchRulesetPresetMeta = {
  id: string;
  description: string;
};

/** Alias for preset builders (same shape as default creation ruleset payloads). */
export type RepoRulesetPayload = RepoRulesetUpsertPayload;

const rulesetNamePrefix = 'Backstage: ';

/**
 * Maps preset ids → ruleset payload (without owner/repo). Targets `refs/heads/<branch>`.
 */
export function buildBranchRulesetPreset(
  presetId: string,
  branchName: string,
): RepoRulesetPayload {
  const include = [`refs/heads/${branchName}`];
  const conditions = {
    ref_name: {
      include,
      exclude: [] as string[],
    },
  };

  switch (presetId) {
    case 'require-pull-request':
      return {
        name: `${rulesetNamePrefix}Require pull request`,
        target: 'branch',
        enforcement: 'active',
        conditions,
        rules: [
          {
            type: 'pull_request',
            parameters: {
              required_approving_review_count: 1,
              dismiss_stale_reviews_on_push: true,
              require_code_owner_review: false,
              require_last_push_approval: false,
              required_review_thread_resolution: false,
            },
          },
        ],
      };
    case 'require-linear-history':
      return {
        name: `${rulesetNamePrefix}Linear history`,
        target: 'branch',
        enforcement: 'active',
        conditions,
        rules: [{ type: 'required_linear_history' }],
      };
    case 'block-force-push':
      return {
        name: `${rulesetNamePrefix}Block force pushes`,
        target: 'branch',
        enforcement: 'active',
        conditions,
        rules: [{ type: 'non_fast_forward' }],
      };
    default:
      throw new Error(`Unknown branch ruleset preset: ${presetId}`);
  }
}

/** Ordered list for UI and validation. */
export const BRANCH_RULESET_PRESET_META: BranchRulesetPresetMeta[] = [
  {
    id: 'require-pull-request',
    description:
      'Require at least one approving review before merging to the default branch.',
  },
  {
    id: 'require-linear-history',
    description: 'Prevent merge commits on the default branch (linear history).',
  },
  {
    id: 'block-force-push',
    description: 'Disallow force pushes to the default branch.',
  },
];

export const BRANCH_RULESET_PRESET_IDS = new Set(
  BRANCH_RULESET_PRESET_META.map(p => p.id),
);
