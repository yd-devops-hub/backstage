import type {
  BackstageCredentials,
  LoggerService,
} from '@backstage/backend-plugin-api';
import type { JsonValue } from '@backstage/types';
import { ConflictError, InputError, NotFoundError, NotAllowedError, AuthenticationError } from '@backstage/errors';
import type { NotificationService } from '@backstage/plugin-notifications-node';
import type { Config } from '@backstage/config';

import type { ApprovableAction } from '../extensions';
import {
  ApprovalsStore,
  type ApprovalRequestRow,
  type ApprovalRequestStatus,
} from '../database/ApprovalsStore';
import { ApproverResolver } from './ApproverResolver';
import { ApprovalsNotifier } from './Notifier';

type ActionRegistry = {
  get(type: string): ApprovableAction | undefined;
};

export type CreateRequestInput = {
  actionType: string;
  payload: JsonValue;
  requesterRef: string;
  credentials: BackstageCredentials;
};

export class ApprovalsService {
  private readonly notifier: ApprovalsNotifier;

  constructor(
    private readonly store: ApprovalsStore,
    private readonly actions: ActionRegistry,
    private readonly resolver: ApproverResolver,
    notifications: NotificationService,
    config: Config,
    private readonly logger: LoggerService,
  ) {
    this.notifier = new ApprovalsNotifier(notifications, config);
  }

  async createRequest(input: CreateRequestInput) {
    const action = this.actions.get(input.actionType);
    if (!action) {
      throw new InputError(`Unknown approval action type: ${input.actionType}`);
    }

    const parsed = action.schema.safeParse(input.payload);
    if (!parsed.success) {
      throw new InputError(parsed.error.message);
    }

    const approverRefs = await this.resolver.resolveApproverUserRefs(
      input.actionType,
      input.credentials,
    );

    const row = await this.store.insertRequest({
      actionType: input.actionType,
      requesterRef: input.requesterRef,
      payload: parsed.data as JsonValue,
      approverRefs,
    });

    try {
      await this.notifier.notifyNewRequest({
        requestId: row.id,
        actionType: input.actionType,
        approverUserRefs: approverRefs,
        excludeEntityRef: input.requesterRef,
      });
    } catch (e) {
      this.logger.warn(
        `approvals: failed to notify approvers: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return row;
  }

  async getRequestForUser(id: string, userRef: string): Promise<ApprovalRequestRow> {
    const row = await this.store.getById(id);
    if (!row) {
      throw new NotFoundError(`Approval request not found`);
    }
    const isRequester = row.requesterRef === userRef;
    const isApprover = row.approverRefs.includes(userRef);
    if (!isRequester && !isApprover) {
      throw new NotFoundError(`Approval request not found`);
    }
    return row;
  }

  async listMine(userRef: string): Promise<ApprovalRequestRow[]> {
    return this.store.listByRequester(userRef);
  }

  async listInbox(userRef: string): Promise<ApprovalRequestRow[]> {
    return this.store.listPendingForUser(userRef);
  }

  async approve(
    id: string,
    approverRef: string,
    comment: string | undefined,
  ): Promise<ApprovalRequestRow> {
    const row = await this.requirePending(id);
    if (!row.approverRefs.includes(approverRef)) {
      throw new NotAllowedError('You are not an approver for this request');
    }

    const action = this.actions.get(row.actionType);
    if (!action) {
      throw new ConflictError(
        `Action handler missing for type ${row.actionType}; cannot execute.`,
      );
    }

    await this.store.updateStatus(id, {
      status: 'executing',
      decidedByRef: approverRef,
      decisionComment: comment ?? null,
      decidedAt: new Date(),
    });

    let result: JsonValue;
    try {
      result = (await action.execute(row.payload, {
        logger: this.logger,
      })) as JsonValue;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.store.updateStatus(id, {
        status: 'failed',
        error: message,
      });
      try {
        await this.notifier.notifyRequester({
          requestId: id,
          requesterRef: row.requesterRef,
          title: 'Request failed after approval',
          description: message,
        });
      } catch (e) {
        this.logger.warn(`approvals: notify failure: ${e}`);
      }
      throw new ConflictError(`Execution failed: ${message}`);
    }

    await this.store.updateStatus(id, {
      status: 'succeeded',
      result,
    });

    try {
      await this.notifier.notifyRequester({
        requestId: id,
        requesterRef: row.requesterRef,
        title: 'Request completed',
        description: `Your "${row.actionType}" action finished successfully.`,
      });
    } catch (e) {
      this.logger.warn(`approvals: notify completion: ${e}`);
    }

    return (await this.store.getByIdOrThrow(id)) as ApprovalRequestRow;
  }

  async reject(
    id: string,
    approverRef: string,
    comment: string | undefined,
  ): Promise<ApprovalRequestRow> {
    const row = await this.requirePending(id);
    if (!row.approverRefs.includes(approverRef)) {
      throw new NotAllowedError('You are not an approver for this request');
    }
    await this.store.updateStatus(id, {
      status: 'rejected',
      decidedByRef: approverRef,
      decisionComment: comment ?? null,
      decidedAt: new Date(),
    });
    try {
      await this.notifier.notifyRequester({
        requestId: id,
        requesterRef: row.requesterRef,
        title: 'Request rejected',
        description: comment ?? `Your "${row.actionType}" request was rejected.`,
      });
    } catch (e) {
      this.logger.warn(`approvals: notify reject: ${e}`);
    }
    return this.store.getByIdOrThrow(id);
  }

  async cancel(id: string, requesterRef: string): Promise<ApprovalRequestRow> {
    const row = await this.requirePending(id);
    if (row.requesterRef !== requesterRef) {
      throw new NotAllowedError('Only the requester can cancel this request');
    }
    await this.store.updateStatus(id, { status: 'cancelled' });
    return this.store.getByIdOrThrow(id);
  }

  private async requirePending(id: string): Promise<ApprovalRequestRow> {
    const row = await this.store.getById(id);
    if (!row) {
      throw new NotFoundError(`Approval request not found`);
    }
    if (row.status !== 'pending') {
      throw new ConflictError(
        `Request is already ${row.status as ApprovalRequestStatus}`,
      );
    }
    return row;
  }
}

/** Serialize row for API responses */
export function toResponseDto(row: ApprovalRequestRow) {
  return {
    id: row.id,
    actionType: row.actionType,
    requesterRef: row.requesterRef,
    payload: row.payload,
    approverRefs: row.approverRefs,
    status: row.status,
    decidedByRef: row.decidedByRef,
    decisionComment: row.decisionComment,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    result: row.result,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function userRefFromCredentials(
  credentials: BackstageCredentials,
): string {
  const principal = credentials.principal as {
    type: string;
    userEntityRef?: string;
  };
  if (principal.type !== 'user' || !principal.userEntityRef) {
    throw new AuthenticationError('User credentials required');
  }
  return principal.userEntityRef;
}
