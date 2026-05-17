import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import type { ScmIntegrations } from '@backstage/integration';

import type { GithubRepoService } from '../services/GithubRepoService';
import { parseGithubOwnerRepoFromScaffolderRepoUrl } from './parseGithubOwnerRepoFromScaffolderRepoUrl';

export function createGithubApplyOrgDefaultRulesetAction(options: {
  githubRepos: GithubRepoService;
  integrations: ScmIntegrations;
}) {
  const { githubRepos, integrations } = options;

  return createTemplateAction({
    id: 'github:repo:apply-org-default-ruleset',
    description:
      'Applies the same default-branch repository ruleset as the manage-github-repo plugin (targets ~DEFAULT_BRANCH). Run after publish:github.',
    schema: {
      input: z =>
        z.object({
          repoUrl: z
            .string()
            .describe(
              'Repo URL: RepoUrlPicker value (github.com?owner=&repo=) or HTTPS remote from publish:github',
            ),
        }),
      output: z =>
        z.object({
          owner: z.string().describe('Owner or organization'),
          repo: z.string().describe('Repository name'),
        }),
    },
    async handler(ctx) {
      const { owner: o, repo: r } = parseGithubOwnerRepoFromScaffolderRepoUrl(
        ctx.input.repoUrl,
        integrations,
      );
      await githubRepos.applyDefaultRepoCreationRuleset(o, r, ctx.logger);
      ctx.output('owner', o);
      ctx.output('repo', r);
    },
  });
}
