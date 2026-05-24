import {
  allRepoSettingRegistrations,
  getRepoSettingUiDefinitions,
  githubRepoSettingsSchema,
  isHighSensitivitySettingId,
} from './settings/composedRegistry';

describe('composedRegistry', () => {
  it('has unique ids per registration', () => {
    const ids = new Set<string>();
    for (const row of allRepoSettingRegistrations()) {
      expect(ids.has(row.meta.id)).toBe(false);
      ids.add(row.meta.id);
    }
  });

  it('parses empty settings payload', () => {
    expect(githubRepoSettingsSchema.parse({})).toEqual({});
  });

  it('parses layered merge + ruleset vector', () => {
    expect(
      githubRepoSettingsSchema.parse({
        defaultBranch: 'main',
        allowSquashMerge: true,
        branchRulesetPresetIds: ['require-pull-request'],
      }),
    ).toMatchObject({
      defaultBranch: 'main',
      allowSquashMerge: true,
      branchRulesetPresetIds: ['require-pull-request'],
    });
  });

  it('rejects unknown keys strictly', () => {
    expect(() =>
      githubRepoSettingsSchema.parse({ notARealGithubField123: true }),
    ).toThrow();
  });

  it('detects privileged settings metadata', () => {
    expect(isHighSensitivitySettingId('visibility')).toBe(true);
    expect(isHighSensitivitySettingId('topics')).toBe(false);
    expect(getRepoSettingUiDefinitions().length).toEqual(
      allRepoSettingRegistrations().length,
    );
  });
});
