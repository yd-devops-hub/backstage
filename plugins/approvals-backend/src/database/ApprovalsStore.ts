import { resolvePackagePath } from '@backstage/backend-plugin-api';
import type {
  DatabaseService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import type { JsonValue } from '@backstage/types';
import { randomUUID } from 'node:crypto';
import type { Knex } from 'knex';

export type ApprovalRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'executing'
  | 'succeeded'
  | 'failed';

export type ApprovalRequestRow = {
  id: string;
  actionType: string;
  requesterRef: string;
  payload: JsonValue;
  approverRefs: string[];
  status: ApprovalRequestStatus;
  decidedByRef: string | null;
  decisionComment: string | null;
  decidedAt: Date | null;
  result: JsonValue | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

const migrationsDir = resolvePackagePath(
  '@internal/backstage-plugin-approvals-backend',
  'migrations',
);

function mapRow(row: Record<string, unknown>): ApprovalRequestRow {
  return {
    id: String(row.id),
    actionType: String(row.action_type),
    requesterRef: String(row.requester_ref),
    payload: JSON.parse(String(row.payload_json)) as JsonValue,
    approverRefs: JSON.parse(String(row.approver_refs_json)) as string[],
    status: String(row.status) as ApprovalRequestStatus,
    decidedByRef: row.decided_by_ref ? String(row.decided_by_ref) : null,
    decisionComment: row.decision_comment
      ? String(row.decision_comment)
      : null,
    decidedAt: row.decided_at ? new Date(String(row.decided_at)) : null,
    result: row.result_json
      ? (JSON.parse(String(row.result_json)) as JsonValue)
      : null,
    error: row.error ? String(row.error) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)) : null,
  };
}

/** @internal */
export class ApprovalsStore {
  private db: Knex;
  private isSQLite: boolean;

  private constructor(db: Knex) {
    this.db = db;
    this.isSQLite = db.client.config.client.includes('sqlite3');
  }

  static async create(options: {
    database: DatabaseService;
    logger: LoggerService;
    skipMigrations?: boolean;
  }): Promise<ApprovalsStore> {
    const client = await options.database.getClient();
    if (!options.database.migrations?.skip && !options.skipMigrations) {
      await client.migrate.latest({ directory: migrationsDir });
    }
    return new ApprovalsStore(client);
  }

  async insertRequest(input: {
    actionType: string;
    requesterRef: string;
    payload: JsonValue;
    approverRefs: string[];
  }): Promise<ApprovalRequestRow> {
    const id = randomUUID();
    const now = this.db.fn.now();
    await this.db('approval_requests').insert({
      id,
      action_type: input.actionType,
      requester_ref: input.requesterRef,
      payload_json: JSON.stringify(input.payload),
      approver_refs_json: JSON.stringify(input.approverRefs),
      status: 'pending',
      created_at: now as unknown as Date,
      updated_at: now as unknown as Date,
    });
    const row = await this.getByIdOrThrow(id);
    return row;
  }

  async getById(id: string): Promise<ApprovalRequestRow | undefined> {
    const row = await this.db('approval_requests').where({ id }).first();
    return row ? mapRow(row) : undefined;
  }

  async getByIdOrThrow(id: string): Promise<ApprovalRequestRow> {
    const r = await this.getById(id);
    if (!r) {
      throw new Error(`Approval request not found: ${id}`);
    }
    return r;
  }

  async listByRequester(requesterRef: string): Promise<ApprovalRequestRow[]> {
    const rows = await this.db('approval_requests')
      .where({ requester_ref: requesterRef })
      .orderBy('created_at', 'desc');
    return rows.map(mapRow);
  }

  async listPendingForUser(userRef: string): Promise<ApprovalRequestRow[]> {
    if (this.isSQLite) {
      const rows = await this.db('approval_requests').where({ status: 'pending' });
      return rows.map(mapRow).filter(r => r.approverRefs.includes(userRef));
    }
    const rows = await this.db('approval_requests')
      .where({ status: 'pending' })
      .whereRaw('approver_refs_json::jsonb @> ?::jsonb', [
        JSON.stringify([userRef]),
      ]);
    return rows.map(mapRow);
  }

  async updateStatus(
    id: string,
    patch: Partial<{
      status: ApprovalRequestStatus;
      decidedByRef: string | null;
      decisionComment: string | null;
      decidedAt: Date | null;
      result: JsonValue | null;
      error: string | null;
    }>,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      updated_at: this.db.fn.now(),
    };
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.decidedByRef !== undefined)
      update.decided_by_ref = patch.decidedByRef;
    if (patch.decisionComment !== undefined)
      update.decision_comment = patch.decisionComment;
    if (patch.decidedAt !== undefined) update.decided_at = patch.decidedAt;
    if (patch.result !== undefined)
      update.result_json = patch.result === null ? null : JSON.stringify(patch.result);
    if (patch.error !== undefined) update.error = patch.error;

    await this.db('approval_requests').where({ id }).update(update);
  }
}
