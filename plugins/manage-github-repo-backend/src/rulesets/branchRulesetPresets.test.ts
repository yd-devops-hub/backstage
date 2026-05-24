import { BRANCH_RULESET_PRESET_IDS } from '@internal/backstage-plugin-manage-github-repo-common';

import { buildBranchRulesetPreset } from './branchRulesetPresets';

describe('branchRulesetPresets', () => {
  it('covers known preset ids', () => {
    expect(BRANCH_RULESET_PRESET_IDS.has('require-pull-request')).toBe(true);
    expect(BRANCH_RULESET_PRESET_IDS.has('require-linear-history')).toBe(true);
    expect(BRANCH_RULESET_PRESET_IDS.has('block-force-push')).toBe(true);
    expect(BRANCH_RULESET_PRESET_IDS.has('strict-default-branch-bundle')).toBe(true);
  });

  it('builds rulesets targeting the branch ref', () => {
    const ruleset = buildBranchRulesetPreset('block-force-push', 'develop');
    expect(ruleset).toMatchObject({
      conditions: {
        ref_name: {
          include: ['refs/heads/develop'],
        },
      },
      rules: expect.arrayContaining([{ type: 'non_fast_forward' }]),
    });
  });

  it('rejects unknown presets', () => {
    expect(() => buildBranchRulesetPreset('unknown', 'main')).toThrow(
      /Unknown branch ruleset preset/,
    );
  });
});
