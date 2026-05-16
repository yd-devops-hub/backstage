import {
  createApiFactory,
  createApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';

import type { ApprovalRequestDto, SubmitApprovalResult } from './types';

/** @public */
export const approvalsApiRef = createApiRef<ApprovalsApi>({
  id: 'plugin.approvals.service',
});

export type ApprovalsApi = {
  submitRequest(
    actionType: string,
    payload: unknown,
  ): Promise<SubmitApprovalResult>;
  listMine(): Promise<{ items: ApprovalRequestDto[] }>;
  listInbox(): Promise<{ items: ApprovalRequestDto[] }>;
  getRequest(id: string): Promise<ApprovalRequestDto>;
  approve(id: string, comment?: string): Promise<ApprovalRequestDto>;
  reject(id: string, comment?: string): Promise<ApprovalRequestDto>;
  cancel(id: string): Promise<ApprovalRequestDto>;
};

/** @public */
export const approvalsApiFactory = createApiFactory({
  api: approvalsApiRef,
  deps: { fetchApi: fetchApiRef },
  factory: ({ fetchApi }) => new ApprovalsClient({ fetch: fetchApi.fetch }),
});

class ApprovalsClient implements ApprovalsApi {
  constructor(
    private readonly options: { fetch: typeof fetchApiRef.T.fetch },
  ) {}

  private async parseResponse(
    response: Response,
  ): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    if (!response.ok) {
      const message =
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof (body as { error: unknown }).error === 'string'
          ? (body as { error: string }).error
          : `Request failed (${response.status})`;
      return { ok: false, error: message };
    }
    return { ok: true, data: body };
  }

  async submitRequest(
    actionType: string,
    payload: unknown,
  ): Promise<SubmitApprovalResult> {
    const response = await this.options.fetch('plugin://approvals/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType, payload }),
    });
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      return parsed;
    }
    return { ok: true, data: parsed.data as ApprovalRequestDto };
  }

  async listMine(): Promise<{ items: ApprovalRequestDto[] }> {
    const response = await this.options.fetch(
      'plugin://approvals/requests?scope=mine',
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as { items: ApprovalRequestDto[] };
  }

  async listInbox(): Promise<{ items: ApprovalRequestDto[] }> {
    const response = await this.options.fetch(
      'plugin://approvals/requests?scope=inbox',
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as { items: ApprovalRequestDto[] };
  }

  async getRequest(id: string): Promise<ApprovalRequestDto> {
    const response = await this.options.fetch(
      `plugin://approvals/requests/${encodeURIComponent(id)}`,
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as ApprovalRequestDto;
  }

  async approve(id: string, comment?: string): Promise<ApprovalRequestDto> {
    const response = await this.options.fetch(
      `plugin://approvals/requests/${encodeURIComponent(id)}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      },
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as ApprovalRequestDto;
  }

  async reject(id: string, comment?: string): Promise<ApprovalRequestDto> {
    const response = await this.options.fetch(
      `plugin://approvals/requests/${encodeURIComponent(id)}/reject`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      },
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as ApprovalRequestDto;
  }

  async cancel(id: string): Promise<ApprovalRequestDto> {
    const response = await this.options.fetch(
      `plugin://approvals/requests/${encodeURIComponent(id)}/cancel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as ApprovalRequestDto;
  }
}
