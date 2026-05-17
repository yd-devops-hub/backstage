import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { ScmIntegrations } from '@backstage/integration';

import { GithubRepoService } from '../services/GithubRepoService';
import { createCatalogRegisterOrRefreshAction } from './catalogRegisterOrRefresh';
import { createGithubApplyOrgDefaultRulesetAction } from './githubApplyOrgDefaultRuleset';

/**
 * Extends the scaffolder with GitHub repo actions that reuse GithubRepoService.
 */
export const manageGithubRepoScaffolderModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'manage-github-repo',
  register(reg) {
    reg.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        catalog: catalogServiceRef,
      },
      async init({ scaffolder, logger, config, catalog }) {
        const integrations = ScmIntegrations.fromConfig(config);
        const githubRepos = new GithubRepoService({ logger, config });
        scaffolder.addActions(
          createGithubApplyOrgDefaultRulesetAction({ githubRepos, integrations }),
          createCatalogRegisterOrRefreshAction({ catalog, integrations }),
        );
      },
    });
  },
});
