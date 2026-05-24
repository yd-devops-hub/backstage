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
            const body =
              githubRepoSettingsUpdatePayloadSchema.parse(payload);

            logger.info(
              `[github-repo-settings-update] repo=${body.owner}/${body.repo} payloadKeys=${JSON.stringify(
                Object.keys(body.settings ?? {}),
              )}`,
            );
            return githubRepos.updateRepository(
              body.owner,
              body.repo,
              body.settings,
              ctx.logger,
            );
          },
        });

        actions.registerAction({
          type: 'github-repo-settings-sensitive-update',
          schema: githubRepoSettingsUpdatePayloadSchema,
          execute: async (payload, ctx) => {
            const body =
              githubRepoSettingsUpdatePayloadSchema.parse(payload);

            logger.info(
              `[github-repo-settings-sensitive-update][audit] repo=${body.owner}/${body.repo} payloadKeys=${JSON.stringify(
                Object.keys(body.settings ?? {}),
              )}`,
            );
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
