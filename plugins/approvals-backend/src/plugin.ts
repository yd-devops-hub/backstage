import {
  createBackendPlugin,
  coreServices,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { notificationService } from '@backstage/plugin-notifications-node';

import {
  approvalsActionsExtensionPoint,
  type ApprovableAction,
  type ApprovalsActionsApi,
} from './extensions';
import { ApprovalsStore } from './database/ApprovalsStore';
import { ApproverResolver } from './services/ApproverResolver';
import { ApprovalsService } from './services/ApprovalsService';
import { createApprovalsRouter } from './router';

class ApprovalsActionsRegistry implements ApprovalsActionsApi {
  private readonly map = new Map<string, ApprovableAction>();

  registerAction(action: ApprovableAction): void {
    if (this.map.has(action.type)) {
      throw new Error(
        `approvals: duplicate ApprovableAction registration for "${action.type}"`,
      );
    }
    this.map.set(action.type, action);
  }

  get(type: string): ApprovableAction | undefined {
    return this.map.get(type);
  }
}

/**
 * Backend plugin for generic approval-gated actions.
 *
 * @public
 */
export const approvalsPlugin = createBackendPlugin({
  pluginId: 'approvals',
  register(env) {
    const registry = new ApprovalsActionsRegistry();
    env.registerExtensionPoint(approvalsActionsExtensionPoint, registry);

    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        database: coreServices.database,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        catalog: catalogServiceRef,
        notifications: notificationService,
      },
      async init({
        logger,
        httpRouter,
        database,
        config,
        httpAuth,
        catalog,
        notifications,
      }) {
        const store = await ApprovalsStore.create({ database, logger });
        const resolver = new ApproverResolver(config, catalog, logger);
        const approvals = new ApprovalsService(
          store,
          registry,
          resolver,
          notifications,
          config,
          logger,
        );

        httpRouter.use(await createApprovalsRouter({ approvals, httpAuth, logger }));
      },
    });
  },
});
