import { createExtensionPoint } from '@backstage/backend-plugin-api';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { z } from 'zod/v3';

/** @public */
export type ActionExecutionContext = {
  logger: LoggerService;
};

/**
 * Registered by consumer plugins (e.g. manage-github-team, manage-github-repo) to define executable
 * actions gated by the approvals flow.
 *
 * @public
 */
export type ApprovableAction = {
  type: string;
  schema: z.ZodType<unknown>;
  execute: (
    payload: unknown,
    ctx: ActionExecutionContext,
  ) => Promise<unknown>;
};

/**
 * Allows backend modules to register {@link ApprovableAction} handlers.
 *
 * @public
 */
export type ApprovalsActionsApi = {
  registerAction(action: ApprovableAction): void;
};

/** @public */
export const approvalsActionsExtensionPoint =
  createExtensionPoint<ApprovalsActionsApi>({
    id: 'approvals.actions',
  });
