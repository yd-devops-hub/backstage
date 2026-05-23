import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import {
  defaultOrganizationTeamTransformer,
} from '@backstage/plugin-catalog-backend-module-github';
import {
  githubOrgEntityProviderTransformsExtensionPoint,
} from '@backstage/plugin-catalog-backend-module-github-org';
import type { GroupEntity } from '@backstage/catalog-model';

/** Label GitHub org teams consistently in the catalog (still kind: Group). */
export const catalogGithubOrgTeamLabelsModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'github-org-team-labels',
  register(env) {
    env.registerInit({
      deps: {
        transforms: githubOrgEntityProviderTransformsExtensionPoint,
        logger: coreServices.logger,
      },
      async init({ transforms, logger }) {
        transforms.setTeamTransformer(async (team, ctx) => {
          const entity = (await defaultOrganizationTeamTransformer(
            team,
            ctx,
          )) as GroupEntity | undefined;

          if (!entity) {
            return undefined;
          }

          entity.spec.type = 'github-team';
          if (team.name) {
            entity.metadata.title = team.name;
            entity.spec.profile = {
              ...entity.spec.profile,
              displayName: team.name,
            };
          }

          return entity;
        });

        logger.info(
          'GitHub org teams ingested as catalog Groups labeled github-team',
        );
      },
    });
  },
});
