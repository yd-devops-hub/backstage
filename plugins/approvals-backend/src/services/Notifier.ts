import type { NotificationService } from '@backstage/plugin-notifications-node';
import type { Config } from '@backstage/config';

const ORIGIN = 'plugin:approvals';

/**
 * Thin wrapper for approval-related notifications.
 */
export class ApprovalsNotifier {
  constructor(
    private readonly notifications: NotificationService,
    private readonly config: Config,
  ) {}

  private baseUrl(): string {
    return this.config.getString('app.baseUrl').replace(/\/$/, '');
  }

  async notifyNewRequest(input: {
    requestId: string;
    actionType: string;
    approverUserRefs: string[];
    excludeEntityRef?: string;
  }): Promise<void> {
    const link = `${this.baseUrl()}/approvals/${input.requestId}`;
    await this.notifications.send({
      recipients: {
        type: 'entity',
        entityRef: input.approverUserRefs,
        excludeEntityRef: input.excludeEntityRef,
      },
      payload: {
        title: 'Approval required',
        description: `Action "${input.actionType}" needs your decision.`,
        link,
        topic: 'approvals',
        severity: 'normal',
        scope: `approval-request:${input.requestId}`,
        metadata: { origin: ORIGIN },
      },
    });
  }

  async notifyRequester(input: {
    requestId: string;
    requesterRef: string;
    title: string;
    description?: string;
  }): Promise<void> {
    const link = `${this.baseUrl()}/approvals/${input.requestId}`;
    await this.notifications.send({
      recipients: { type: 'entity', entityRef: input.requesterRef },
      payload: {
        title: input.title,
        description: input.description,
        link,
        topic: 'approvals',
        severity: 'normal',
        scope: `approval-request:${input.requestId}`,
        metadata: { origin: ORIGIN },
      },
    });
  }
}
