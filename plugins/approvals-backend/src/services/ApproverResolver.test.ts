import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';
import type { CatalogService } from '@backstage/plugin-catalog-node';

import { ApproverResolver } from './ApproverResolver';

describe('ApproverResolver', () => {
  it('resolves user refs from config', async () => {
    const config = new ConfigReader({
      approvals: {
        defaults: { approvers: ['user:default/alice'] },
        actions: {
          'github-team-create': {
            approvers: ['user:default/bob'],
          },
        },
      },
    });
    const catalog = {
      queryEntities: jest.fn(),
    } as unknown as CatalogService;
    const logger = mockServices.logger.mock();
    const resolver = new ApproverResolver(config, catalog, logger);

    const users = await resolver.resolveApproverUserRefs(
      'github-team-create',
      {} as any,
    );
    expect(users).toEqual(['user:default/bob']);
    expect(catalog.queryEntities).not.toHaveBeenCalled();
  });
});
