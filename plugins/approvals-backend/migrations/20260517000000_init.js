/*
 * Approvals plugin — pending action requests with single-decision workflow.
 */

// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('approval_requests', table => {
    table.uuid('id').primary();
    table.string('action_type', 255).notNullable();
    table.string('requester_ref', 512).notNullable();
    table.text('payload_json').notNullable();
    table.text('approver_refs_json').notNullable();
    table.string('status', 32).notNullable();
    table.string('decided_by_ref', 512).nullable();
    table.text('decision_comment').nullable();
    table.datetime('decided_at').nullable();
    table.text('result_json').nullable();
    table.text('error').nullable();
    table
      .datetime('created_at')
      .defaultTo(knex.fn.now())
      .notNullable();
    table.datetime('updated_at').nullable();

    table.index(['action_type'], 'approval_requests_action_type_idx');
    table.index(['requester_ref'], 'approval_requests_requester_idx');
    table.index(['status'], 'approval_requests_status_idx');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('approval_requests');
};
