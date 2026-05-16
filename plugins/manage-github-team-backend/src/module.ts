import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { approvalsActionsExtensionPoint } from '@internal/backstage-plugin-approvals-backend';

import {
  GithubTeamService,
  githubTeamCreatePayloadSchema,
} from './services/GithubTeamService';

export const manageGithubTeamApprovalsModule = createBackendModule({
  pluginId: 'approvals',
  moduleId: 'github-team-create',
  register(reg) {
    reg.registerInit({
      deps: {
        actions: approvalsActionsExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ actions, logger, config }) {
        const githubTeams = new GithubTeamService({ logger, config });
        actions.registerAction({
          type: 'github-team-create',
          schema: githubTeamCreatePayloadSchema,
          execute: async (payload, ctx) => {
            return githubTeams.executeCreateTeam(
              githubTeamCreatePayloadSchema.parse(payload),
              ctx.logger,
            );
          },
        });
      },
    });
  },
});
