import type { ScmIntegrations } from '@backstage/integration';

import { parseGithubOwnerRepoFromScaffolderRepoUrl } from './parseGithubOwnerRepoFromScaffolderRepoUrl';

function mockIntegrations(hosts: string[]): ScmIntegrations {
  return {
    byHost(host: string) {
      return hosts.includes(host) ? { type: 'github' as const } : undefined;
    },
  } as ScmIntegrations;
}

describe('parseGithubOwnerRepoFromScaffolderRepoUrl', () => {
  const integrations = mockIntegrations(['github.com']);

  it('parses publish:github remoteUrl (https)', () => {
    expect(
      parseGithubOwnerRepoFromScaffolderRepoUrl(
        'https://github.com/my-org/my-repo.git',
        integrations,
      ),
    ).toEqual({ owner: 'my-org', repo: 'my-repo' });
  });

  it('parses https URL without .git suffix', () => {
    expect(
      parseGithubOwnerRepoFromScaffolderRepoUrl(
        'https://github.com/acme/hello-world',
        integrations,
      ),
    ).toEqual({ owner: 'acme', repo: 'hello-world' });
  });

  it('delegates RepoUrlPicker format to parseRepoUrl', () => {
    expect(
      parseGithubOwnerRepoFromScaffolderRepoUrl(
        'github.com?repo=my-repo&owner=my-org',
        integrations,
      ),
    ).toEqual({ owner: 'my-org', repo: 'my-repo' });
  });
});
