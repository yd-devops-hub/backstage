import { InputError } from '@backstage/errors';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Octokit } from '@octokit/rest';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import { BRANCH_RULESET_PRESET_IDS } from '@internal/backstage-plugin-manage-github-repo-common';

import { buildBranchRulesetPreset } from '../rulesets/branchRulesetPresets';
import type { RepoRulesetPayload } from '../rulesets/branchRulesetPresets';
import type { RepoRulesetUpsertPayload } from '../rulesets/defaultRepoCreationRuleset';

export async function loadRulesetNameMap(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<Map<string, { id: number }>> {
  const { data: rulesets } = await octokit.rest.repos.getRepoRulesets({
    owner,
    repo,
  });
  const byName = new Map<string, { id: number }>();
  for (const r of rulesets) {
    if (typeof r?.name === 'string' && r.id !== undefined) {
      byName.set(r.name, { id: r.id });
    }
  }
  return byName;
}

export async function upsertRepoRulesetPayload(
  octokit: Octokit,
  owner: string,
  repo: string,
  payload: RepoRulesetUpsertPayload,
  byName: Map<string, { id: number }>,
  logger: LoggerService,
): Promise<void> {
  const existing = byName.get(payload.name);
  if (existing !== undefined) {
    logger.info(`Updating ruleset "${payload.name}" on ${owner}/${repo}`);
    await octokit.rest.repos.updateRepoRuleset({
      owner,
      repo,
      ruleset_id: existing.id,
      ...payload,
    } as RestEndpointMethodTypes['repos']['updateRepoRuleset']['parameters']);
  } else {
    logger.info(`Creating ruleset "${payload.name}" on ${owner}/${repo}`);
    const created = await octokit.rest.repos.createRepoRuleset({
      owner,
      repo,
      ...payload,
    } as RestEndpointMethodTypes['repos']['createRepoRuleset']['parameters']);
    if (created.data.name && created.data.id !== undefined) {
      byName.set(created.data.name, { id: created.data.id });
    }
  }
}

function presetNameForId(presetId: string, branchDummy: string): string {
  return buildBranchRulesetPreset(presetId, branchDummy).name;
}

function presetIdFromManagedRulesetName(candidateName: string): string | undefined {
  const dummy = '__branch__';
  for (const presetId of BRANCH_RULESET_PRESET_IDS) {
    if (presetNameForId(presetId, dummy) === candidateName) {
      return presetId;
    }
  }
  return undefined;
}

/** Derive which managed presets are represented on GitHub by ruleset names. */
export function detectInstalledPresetIds(
  rulesetNamesFromGithub: Iterable<string>,
): string[] {
  const active = new Set<string>();
  for (const ghName of rulesetNamesFromGithub) {
    const id = presetIdFromManagedRulesetName(ghName);
    if (id) {
      active.add(id);
    }
  }
  return [...active].sort((a, b) => a.localeCompare(b));
}

export async function syncRepositoryRulesets(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchForScopedPresets: string,
  desiredPresetIds: readonly string[],
  logger: LoggerService,
): Promise<void> {
  const byName = await loadRulesetNameMap(octokit, owner, repo);
  const desired = new Set(desiredPresetIds);

  for (const presetId of desired) {
    if (!BRANCH_RULESET_PRESET_IDS.has(presetId)) {
      throw new InputError(`Unknown branch ruleset preset: ${presetId}`);
    }

    const rulesetPayload = buildBranchRulesetPreset(
      presetId,
      branchForScopedPresets,
    ) as RepoRulesetPayload;

    await upsertRepoRulesetPayload(
      octokit,
      owner,
      repo,
      rulesetPayload as RepoRulesetUpsertPayload,
      byName,
      logger,
    );
  }

  const latest = await loadRulesetNameMap(octokit, owner, repo);
  for (const [name, meta] of latest.entries()) {
    const presetId = presetIdFromManagedRulesetName(name);
    if (!presetId) {
      continue;
    }
    if (desired.has(presetId)) {
      continue;
    }
    logger.info(`Deleting preset ruleset "${name}" (${presetId}) on ${owner}/${repo}`);
    await octokit.rest.repos.deleteRepoRuleset({
      owner,
      repo,
      ruleset_id: meta.id,
    });
  }
}
