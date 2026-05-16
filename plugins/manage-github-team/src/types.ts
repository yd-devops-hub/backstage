import type { ApprovalRequestDto } from '@internal/backstage-plugin-approvals';

/**
 * Returned immediately after submitting a team creation for approval
 * (GitHub team does not exist until an approver approves).
 *
 * @public
 */
export type CreateTeamSubmittedResponse = Pick<
  ApprovalRequestDto,
  'id' | 'status' | 'actionType' | 'createdAt'
>;
