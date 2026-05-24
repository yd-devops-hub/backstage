import { z } from 'zod';

/** Topic names for replaceAllTopics — GitHub forbids empties internally; we normalize. */
export const topicsSchema = z.array(z.string().min(1)).max(20);

/** GitHub collaborator permission levels. */
export const collaboratorPermissionSchema = z.enum([
  'pull',
  'triage',
  'push',
  'maintain',
  'admin',
]);

export const collaboratorEntrySchema = z.object({
  username: z.string().min(1),
  permission: collaboratorPermissionSchema,
});

export const collaboratorsSchema = z.array(collaboratorEntrySchema);

export const teamAccessEntrySchema = z.object({
  /** Organization team slug */
  teamSlug: z.string().min(1),
  permission: collaboratorPermissionSchema,
});

export const teamAccessSchema = z.array(teamAccessEntrySchema);

export const webhookEntrySchema = z.object({
  id: z.number().int().positive().optional(),
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
  active: z.boolean().optional(),
  contentType: z.enum(['json', 'form']).optional(),
  /** Provided only when creating/updating; never echoed from API reads. */
  secret: z.string().min(1).optional(),
});

export const webhooksSchema = z.array(webhookEntrySchema);

export const deployKeyEntrySchema = z.object({
  id: z.number().int().positive().optional(),
  /** Base64-encoded public key (RSA). Omit when deleting by id. */
  key: z.string().min(1).optional(),
  title: z.string().min(1),
  read_only: z.boolean().optional(),
});

export const deployKeysSchema = z.array(deployKeyEntrySchema);

/** Minimal environment representation (name-level desired state); expand as needed. */
export const repoEnvironmentProtectionSchema = z
  .object({
    reviewers: z
      .array(
        z.object({
          id: z.number(),
          type: z.enum([
            'User',
            'Team',
          ]),
        }),
      )
      .optional(),
    wait_timer: z.number().int().min(0).optional(),
    prevent_self_review: z.boolean().optional(),
  })
  .optional();

export const environmentEntrySchema = z.object({
  name: z.string().min(1),
  deployment_branch_policy: z
    .object({
      protected_branches: z.boolean(),
      custom_branch_policies: z.boolean(),
    })
    .optional(),
  deployment_branch_policies: z
    .array(
      z.object({
        id: z.number().optional(),
        name: z.string(),
      }),
    )
    .optional(),
  protection_rules: repoEnvironmentProtectionSchema,
});

export const environmentsSchema = z.array(environmentEntrySchema);

/** Secret rotation: name plus plaintext — encrypted server-side via GitHub public key APIs. */
export const secretRotateEntrySchema = z.object({
  name: z.string().min(1),
  plaintext: z.string().min(1),
});

export const actionsSecretsRotateSchema = z.array(secretRotateEntrySchema);
export const dependabotSecretsRotateSchema = z.array(secretRotateEntrySchema);

export const githubActionsRepoPermissionsPayloadSchema = z.object({
  enabled: z.boolean(),
  allowed_actions: z
    .enum(['all', 'local_only', 'selected'])
    .optional(),
  selected_actions_url: z.string().url().nullable().optional(),
});

export const githubWorkflowPermissionsPayloadSchema = z.object({
  default_workflow_permissions: z.enum(['read', 'write']),
  can_approve_pull_request_reviews: z.boolean().optional(),
});

export const githubPagesConfigSchema = z.object({
  build_type: z.enum(['legacy', 'workflow']).optional(),
  legacyBranch: z.string().min(1).optional(),
  legacyPath: z.string().optional(),
});
