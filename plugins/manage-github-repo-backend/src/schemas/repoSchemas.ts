import { z } from 'zod/v3';

/**
 * Repository settings applied via this plugin. Add new optional fields here as GitHub
 * capabilities are exposed — clients may send additional keys only after the backend
 * understands them (validated explicitly below).
 */
export const githubRepoSettingsSchema = z.object({
  /** GitHub default branch name (branch must exist). */
  defaultBranch: z.string().min(1).optional(),
  /** When PRs merge, delete the head branch. */
  deleteBranchOnMerge: z.boolean().optional(),
  /**
   * Named branch ruleset presets (repository rulesets API).
   * See {@link BRANCH_RULESET_PRESETS} on the backend.
   */
  branchRulesetPresetIds: z.array(z.string().min(1)).optional(),
});

export type GithubRepoSettings = z.infer<typeof githubRepoSettingsSchema>;

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

/** Payload for approval-gated repo settings updates (`github-repo-settings-update`). */
export const githubRepoSettingsUpdatePayloadSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  settings: githubRepoSettingsSchema,
});

export type GithubRepoSettingsUpdatePayload = z.infer<
  typeof githubRepoSettingsUpdatePayloadSchema
>;
