import { githubRepoSettingsUpdatePayloadSchema } from './schemas/repoSchemas';

describe('manage-github-repo approvals module wiring', () => {
  it('accepts a minimal github-repo-settings-update payload', () => {
    expect(
      githubRepoSettingsUpdatePayloadSchema.parse({
        owner: 'org',
        repo: 'svc',
        settings: {},
      }),
    ).toEqual({
      owner: 'org',
      repo: 'svc',
      settings: {},
    });
  });
});
