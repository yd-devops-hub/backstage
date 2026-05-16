export { approvalsPlugin as default } from './plugin';
export { approvalsActionsExtensionPoint } from './extensions';
export type {
  ApprovableAction,
  ApprovalsActionsApi,
  ActionExecutionContext,
} from './extensions';
export { approvalsPermissions } from './permissions';
export type { ApprovalsService } from './services/ApprovalsService';
