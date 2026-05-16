import { createPermission } from '@backstage/plugin-permission-common';

/** @public */
export const approvalsRequestCreatePermission = createPermission({
  name: 'approvals.request.create',
  attributes: { action: 'create' },
});

/** @public */
export const approvalsRequestReadPermission = createPermission({
  name: 'approvals.request.read',
  attributes: { action: 'read' },
});

/** @public */
export const approvalsRequestApprovePermission = createPermission({
  name: 'approvals.request.approve',
  attributes: { action: 'update' },
});

/** @public */
export const approvalsRequestRejectPermission = createPermission({
  name: 'approvals.request.reject',
  attributes: { action: 'update' },
});

/** @public */
export const approvalsRequestCancelPermission = createPermission({
  name: 'approvals.request.cancel',
  attributes: { action: 'update' },
});

/** @public */
export const approvalsPermissions = [
  approvalsRequestCreatePermission,
  approvalsRequestReadPermission,
  approvalsRequestApprovePermission,
  approvalsRequestRejectPermission,
  approvalsRequestCancelPermission,
];
