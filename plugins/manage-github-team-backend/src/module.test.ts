import { githubTeamCreatePayloadSchema } from './services/GithubTeamService';

describe('github team approvals module wiring', () => {
  it('accepts the payload shape used by the UI', () => {
    expect(
      githubTeamCreatePayloadSchema.parse({
        teamName: 'platform',
        description: 'hello',
      }),
    ).toEqual({ teamName: 'platform', description: 'hello' });
  });
});
