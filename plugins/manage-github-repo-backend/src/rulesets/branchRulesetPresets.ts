import {
  DEFAULT_REPO_CREATION_RULESET,
  type RepoRulesetUpsertPayload,
} from './defaultRepoCreationRuleset';

export type RepoRulesetPayload = RepoRulesetUpsertPayload;

const rulesetNamePrefix = 'Backstage: ';

/**
 * Maps preset ids → ruleset payload (without owner/repo).
 * Targets `refs/heads/<branch>` except bundled defaults that follow `~DEFAULT_BRANCH`.
 */
export function buildBranchRulesetPreset(
  presetId: string,
  branchName: string,
): RepoRulesetPayload {
  const include = [`refs/heads/${branchName}`];
  const conditionsBranch = {
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
        conditions: conditionsBranch,
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
        conditions: conditionsBranch,
        rules: [{ type: 'required_linear_history' }],
      };
    case 'block-force-push':
      return {
        name: `${rulesetNamePrefix}Block force pushes`,
        target: 'branch',
        enforcement: 'active',
        conditions: conditionsBranch,
        rules: [{ type: 'non_fast_forward' }],
      };
    case 'strict-default-branch-bundle':
      return {
        ...DEFAULT_REPO_CREATION_RULESET,
        name: `${rulesetNamePrefix}Strict default-branch bundle`,
      };
    default:
      throw new Error(`Unknown branch ruleset preset: ${presetId}`);
  }
}
