import type { Entity } from '@backstage/catalog-model';
import {
  ApiBlueprint,
  createFrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { FormFieldBlueprint } from '@backstage/plugin-scaffolder-react/alpha';

import { manageGithubRepoApiFactory } from './api';
import { parseGithubProjectSlug } from './lib/githubProjectSlug';

/**
 * Entity tab route. With app-config `page:catalog/entity.config.groups: []`, all tabs
 * render in one flat navbar (no Development / Documentation dropdown groups).
 */
export const entityGithubRepoSettingsTabExtension =
  EntityContentBlueprint.make({
    name: 'github-repo-settings',
    params: {
      path: '/repo-settings',
      title: 'Repo Settings',
      filter: (entity: Entity) => parseGithubProjectSlug(entity) !== undefined,
      loader: () =>
        import('./components/EntityGithubRepoSettingsContent').then(m => (
          <m.EntityGithubRepoSettingsContent />
        )),
    },
  });

export const manageGithubRepoApiExtension = ApiBlueprint.make({
  name: 'api',
  params: defineParams => defineParams(manageGithubRepoApiFactory),
});

export const githubOrgPickerFormField = FormFieldBlueprint.make({
  name: 'github-org-picker',
  params: {
    field: () =>
      import('./components/GithubOrgPicker').then(m => m.githubOrgPickerField),
  },
});

export const githubTeamPickerFormField = FormFieldBlueprint.make({
  name: 'github-team-picker',
  params: {
    field: () =>
      import('./components/GithubTeamPicker').then(m => m.githubTeamPickerField),
  },
});

export const manageGithubRepoPlugin = createFrontendPlugin({
  pluginId: 'manage-github-repo',
  extensions: [
    manageGithubRepoApiExtension,
    entityGithubRepoSettingsTabExtension,
    githubOrgPickerFormField,
    githubTeamPickerFormField,
  ],
});
