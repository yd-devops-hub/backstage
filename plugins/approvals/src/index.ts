export { approvalsPlugin as default } from './plugin';
export { approvalsApiRef, approvalsApiFactory } from './api';
export { useSubmitApprovalRequest } from './hooks/useSubmitApprovalRequest';
export type { ApprovalRequestDto, SubmitApprovalResult } from './types';
export {
  inboxRouteRef,
  mineRouteRef,
  detailRouteRef,
} from './routes';
