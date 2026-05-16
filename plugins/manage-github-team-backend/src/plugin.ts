import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';

/**
 * GitHub team management — execution is registered against the approvals plugin
 * via {@link manageGithubTeamApprovalsModule}.
 */
export const manageGithubTeamPlugin = createBackendPlugin({
  pluginId: 'manage-github-team',
  register(env) {
    env.registerInit({
      deps: { logger: coreServices.logger },
      async init({ logger }) {
        logger.info('manage-github-team backend loaded');
      },
    });
  },
});
