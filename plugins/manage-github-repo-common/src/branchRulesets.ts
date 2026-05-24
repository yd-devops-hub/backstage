/**
 * Ruleset presets surfaced in Repo Settings UI and approval payloads.
 */
export type BranchRulesetPresetMeta = {
  id: string;
  description: string;
};

export const BRANCH_RULESET_PRESET_META: BranchRulesetPresetMeta[] = [
  {
    id: 'require-pull-request',
    description:
      'Require at least one approving review before merging to the target branch.',
  },
  {
    id: 'require-linear-history',
    description:
      'Prevent merge commits on the target branch (linear history).',
  },
  {
    id: 'block-force-push',
    description: 'Disallow force pushes to the target branch.',
  },
  {
    id: 'strict-default-branch-bundle',
    description:
      'Apply strong default-branch rules (deletion block, linear PR flow, CODEOWNERS, approvals) tracked on ~DEFAULT_BRANCH.',
  },
];

export const BRANCH_RULESET_PRESET_IDS = new Set(
  BRANCH_RULESET_PRESET_META.map(p => p.id),
);
