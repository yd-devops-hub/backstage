import { z } from 'zod/v3';

import {
  githubRepoSettingsSchema as commonGithubRepoSettingsSchema,
  type GithubRepoSettings,
} from '@internal/backstage-plugin-manage-github-repo-common';

/** Validates approval payloads — built from composed registry schema. */
export const githubRepoSettingsSchema = commonGithubRepoSettingsSchema;

export type { GithubRepoSettings };

export const createRepoBodySchema = z.object({
  /** Organization slug; falls back to plugin config / catalog-derived default. */
  org: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  private: z.boolean().optional(),
  /** Initialize with README when true (recommended when applying branch rulesets). */
  autoInit: z.boolean().optional(),
  /**
   * When false (default), applies the standard default-branch ruleset on create
   * (`defaultRepoCreationRuleset.ts`).
   */
  skipDefaultBranchRuleset: z.boolean().optional(),
  settings: githubRepoSettingsSchema.optional(),
});

export type CreateRepoBody = z.infer<typeof createRepoBodySchema>;

export const updateRepoBodySchema = z.object({
  settings: githubRepoSettingsSchema,
});

export type UpdateRepoBody = z.infer<typeof updateRepoBodySchema>;

/** Payload for approval-gated repo settings updates. */
export const githubRepoSettingsUpdatePayloadSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  settings: githubRepoSettingsSchema,
});

export type GithubRepoSettingsUpdatePayload = z.infer<
  typeof githubRepoSettingsUpdatePayloadSchema
>;
