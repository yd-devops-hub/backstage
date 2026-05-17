import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';

import { createGithubRepoRouter } from './router';
import { GithubRepoService } from './services/GithubRepoService';

export const manageGithubRepoBackendPlugin = createBackendPlugin({
  pluginId: 'manage-github-repo',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        config: coreServices.rootConfig,
      },
      async init({ logger, httpRouter, httpAuth, config }) {
        const githubRepos = new GithubRepoService({ logger, config });
        httpRouter.use(
          await createGithubRepoRouter({ githubRepos, httpAuth, logger }),
        );
      },
    });
  },
});
