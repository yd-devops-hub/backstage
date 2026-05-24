import { z } from 'zod';

import type {
  RepoSettingRegistration,
  RepoSettingSensitivity,
  RepoSettingUiDefinition,
} from './types';
import {
  featureReposUpdateRegistrations,
  generalReposUpdateRegistrations,
  mergeReposUpdateRegistrations,
} from './registration/generalMergeFeatures';
import {
  accessSecretsRegistrations,
  actionsPagesRegistrations,
  integrationResourceRegistrations,
  securityAnalysisRegistrations,
  topicsAndRulesetsRegistrations,
} from './registration/integrations';

export function allRepoSettingRegistrations(): RepoSettingRegistration[] {
  return [
    ...generalReposUpdateRegistrations(),
    ...mergeReposUpdateRegistrations(),
    ...featureReposUpdateRegistrations(),
    ...topicsAndRulesetsRegistrations(),
    ...securityAnalysisRegistrations(),
    ...actionsPagesRegistrations(),
    ...integrationResourceRegistrations(),
    ...accessSecretsRegistrations(),
  ];
}

/**
 * Full settings payload used by approvals + HTTP validation.
 * Every top-level key is optional; unknown keys are rejected via `.strict()`.
 */
const _buildShape = () => {
  const registrations = allRepoSettingRegistrations();
  const seen = new Set<string>();
  for (const reg of registrations) {
    const { id } = reg.meta;
    if (seen.has(id)) {
      throw new Error(`Duplicate repo setting id registered: "${id}"`);
    }
    seen.add(id);
  }
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const reg of registrations) {
    shape[reg.meta.id] = reg.schema.optional();
  }
  return z.object(shape).strict();
};

export const githubRepoSettingsSchema = _buildShape();
export type GithubRepoSettings = z.infer<typeof githubRepoSettingsSchema>;

export type RepoSummary = {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  deleteBranchOnMerge: boolean;
  htmlUrl: string;
  private: boolean;
};

/** Result of GET /repos/:owner/:repo — backward-compatible flat summary fields + grouped snapshot bits. */
export type RepoSettingsSnapshot = {
  /** @deprecated Prefer `summary` — kept flat for transitional clients */
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  deleteBranchOnMerge: boolean;
  htmlUrl: string;
  private: boolean;

  summary: RepoSummary;

  settings: GithubRepoSettings;
  managedRulesetPresetIds: string[];

  /** Read-only helpers for rotating secrets UI (plaintext never returned). */
  secretNamesActions?: string[];
  secretNamesDependabot?: string[];
};

/** Public metadata for frontend field rendering / approval routing. */
export function getRepoSettingUiDefinitions(): RepoSettingUiDefinition[] {
  return allRepoSettingRegistrations().map(r => r.meta);
}

const highSensitivityIds = new Set(
  allRepoSettingRegistrations()
    .filter(r => r.meta.sensitivity === 'high')
    .map(r => r.meta.id),
);

export function isHighSensitivitySettingId(id: string): boolean {
  return highSensitivityIds.has(id);
}

export function settingsPayloadTouchesHighSensitivity(
  changedKeys: readonly string[],
): boolean {
  return changedKeys.some(k => highSensitivityIds.has(k));
}

export function repoSettingSensitivityForId(
  id: string,
): RepoSettingSensitivity | undefined {
  const reg = allRepoSettingRegistrations().find(r => r.meta.id === id);
  return reg?.meta.sensitivity;
}
