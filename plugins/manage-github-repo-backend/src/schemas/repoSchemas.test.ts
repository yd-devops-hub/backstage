import {
  createRepoBodySchema,
  githubRepoSettingsSchema,
  githubRepoSettingsUpdatePayloadSchema,
  updateRepoBodySchema,
} from './repoSchemas';

describe('repoSchemas', () => {
  it('parses minimal create body', () => {
    expect(createRepoBodySchema.parse({ name: 'my-service' })).toEqual({
      name: 'my-service',
    });
  });

  it('parses settings used by the UI', () => {
    expect(
      githubRepoSettingsSchema.parse({
        defaultBranch: 'main',
        deleteBranchOnMerge: true,
        branchRulesetPresetIds: ['require-pull-request'],
      }),
    ).toEqual({
      defaultBranch: 'main',
      deleteBranchOnMerge: true,
      branchRulesetPresetIds: ['require-pull-request'],
    });
  });

  it('parses create body with skip default ruleset flag', () => {
    expect(
      createRepoBodySchema.parse({
        name: 'svc',
        skipDefaultBranchRuleset: true,
      }),
    ).toEqual({
      name: 'svc',
      skipDefaultBranchRuleset: true,
    });
  });

  it('parses update body', () => {
    expect(
      updateRepoBodySchema.parse({
        settings: { deleteBranchOnMerge: false },
      }),
    ).toEqual({
      settings: { deleteBranchOnMerge: false },
    });
  });

  it('parses approval payload for repo settings update', () => {
    expect(
      githubRepoSettingsUpdatePayloadSchema.parse({
        owner: 'acme',
        repo: 'payments',
        settings: { deleteBranchOnMerge: false },
      }),
    ).toEqual({
      owner: 'acme',
      repo: 'payments',
      settings: { deleteBranchOnMerge: false },
    });
  });

  it('rejects unknown repo setting keys', () => {
    expect(() =>
      githubRepoSettingsSchema.parse({ notARealGithubField123: true }),
    ).toThrow();
  });
});
