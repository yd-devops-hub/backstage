import { manageGithubTeamPlugin } from './plugin';

describe('manage-github-team', () => {
  it('should export plugin', () => {
    expect(manageGithubTeamPlugin).toBeDefined();
  });
});
