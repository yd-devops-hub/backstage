import knexFactory from 'knex';
import { mockServices } from '@backstage/backend-test-utils';
import { ApprovalsStore } from './ApprovalsStore';

describe('ApprovalsStore', () => {
  it('inserts and reads approval requests', async () => {
    const knex = knexFactory({
      client: 'better-sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });
    const database = mockServices.database({ knex });
    const logger = mockServices.logger.mock();

    const store = await ApprovalsStore.create({
      database,
      logger,
      skipMigrations: false,
    });

    const row = await store.insertRequest({
      actionType: 'github-team-create',
      requesterRef: 'user:default/dev',
      payload: { teamName: 't1' },
      approverRefs: ['user:default/boss'],
    });

    expect(row.status).toBe('pending');
    expect(row.approverRefs).toEqual(['user:default/boss']);

    const loaded = await store.getById(row.id);
    expect(loaded?.payload).toEqual({ teamName: 't1' });

    await store.updateStatus(row.id, { status: 'succeeded', result: { ok: true } });
    const done = await store.getById(row.id);
    expect(done?.status).toBe('succeeded');
    expect(done?.result).toEqual({ ok: true });

    await knex.destroy();
  });
});
