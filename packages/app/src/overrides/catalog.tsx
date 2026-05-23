import { FrontendFeature } from '@backstage/frontend-plugin-api';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { CatalogFilterBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { z } from 'zod/v4';

import { entityOverviewLayoutExtension } from '../components/catalog/EntityOverviewLayout';
import { badgesContextMenuItem } from './badges';

const githubTeamKindCatalogFilter = CatalogFilterBlueprint.makeWithOverrides({
  name: 'kind',
  configSchema: {
    initialFilter: z.string().default('component'),
  },
  factory(originalFactory, { config }) {
    return originalFactory({
      loader: async () => {
        const { GithubTeamKindPicker } = await import(
          '../components/catalog/GithubTeamKindPicker'
        );
        return (
          <GithubTeamKindPicker
            initialFilter={config?.initialFilter ?? 'component'}
          />
        );
      },
    });
  },
});

export const catalogNavItemOverride: FrontendFeature =
  catalogPlugin.withOverrides({
    extensions: [
      entityOverviewLayoutExtension,
      badgesContextMenuItem,
      githubTeamKindCatalogFilter,
    ],
  });
