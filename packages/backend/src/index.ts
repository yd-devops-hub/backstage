/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import { createBackend } from '@backstage/backend-defaults';
import manageGithubRepoBackend, {
  manageGithubRepoApprovalsModule,
  manageGithubRepoScaffolderModule,
} from '@internal/backstage-plugin-manage-github-repo-backend';
import manageGithubTeamBackend, {
  manageGithubTeamApprovalsModule,
} from '@internal/backstage-plugin-manage-github-team-backend';
import approvalsBackend from '@internal/backstage-plugin-approvals-backend';
import { catalogGithubOrgTeamLabelsModule } from './modules/catalogGithubOrgTeamLabels';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));

// scaffolder plugin
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(
  import('@backstage/plugin-scaffolder-backend-module-notifications'),
);
backend.add(manageGithubRepoScaffolderModule);

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);
backend.add(import('@backstage/plugin-catalog-backend-module-github'));
backend.add(import('@backstage/plugin-catalog-backend-module-github-org'));
backend.add(catalogGithubOrgTeamLabelsModule);
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// community plugins supporting demo UI
backend.add(import('@backstage-community/plugin-badges-backend'));
backend.add(import('@backstage-community/plugin-explore-backend'));

// techdocs plugin
backend.add(import('@backstage/plugin-techdocs-backend'));

// kubernetes plugin
backend.add(import('@backstage/plugin-kubernetes-backend'));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);

// search plugin
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(
  import('@backstage-community/plugin-search-backend-module-explore'),
);

// notifications and signals plugins
backend.add(import('@backstage/plugin-notifications-backend'));
backend.add(import('@backstage/plugin-signals-backend'));

// events plugin
backend.add(import('@backstage/plugin-events-backend'));
backend.add(import('@backstage/plugin-events-backend-module-github'));

// mcp actions plugin
backend.add(import('@backstage/plugin-mcp-actions-backend'));

backend.add(approvalsBackend);
backend.add(manageGithubRepoBackend);
backend.add(manageGithubRepoApprovalsModule);
backend.add(manageGithubTeamBackend);
backend.add(manageGithubTeamApprovalsModule);
backend.start();
