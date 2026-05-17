import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { approvalsActionsExtensionPoint } from '@internal/backstage-plugin-approvals-backend';

import { githubRepoSettingsUpdatePayloadSchema } from './schemas/repoSchemas';
import { GithubRepoService } from './services/GithubRepoService';

export const manageGithubRepoApprovalsModule = createBackendModule({
  pluginId: 'approvals',
  moduleId: 'github-repo-settings-update',
  register(reg) {
    reg.registerInit({
      deps: {
        actions: approvalsActionsExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ actions, logger, config }) {
        const githubRepos = new GithubRepoService({ logger, config });
        actions.registerAction({
          type: 'github-repo-settings-update',
          schema: githubRepoSettingsUpdatePayloadSchema,
          execute: async (payload, ctx) => {
            const body = githubRepoSettingsUpdatePayloadSchema.parse(payload);
            return githubRepos.updateRepository(
              body.owner,
              body.repo,
              body.settings,
              ctx.logger,
            );
          },
        });
      },
    });
  },
});
