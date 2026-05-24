import { z } from 'zod';

import type { RepoSettingRegistration } from '../types';
import {
  actionsSecretsRotateSchema,
  collaboratorsSchema,
  dependabotSecretsRotateSchema,
  deployKeysSchema,
  environmentsSchema,
  githubActionsRepoPermissionsPayloadSchema,
  githubPagesConfigSchema,
  githubWorkflowPermissionsPayloadSchema,
  teamAccessSchema,
  topicsSchema,
  webhooksSchema,
} from '../resourceSchemas';

export function topicsAndRulesetsRegistrations(): RepoSettingRegistration[] {
  return [
    {
      meta: {
        id: 'topics',
        category: 'topics',
        label: 'Topics',
        sensitivity: 'low',
        description:
          'Canonical topic tags for discovery (desired state replaces the full list).',
        ui: {
          control: 'stringList',
          placeholder: 'e.g. kotlin, backstage',
        },
      },
      schema: topicsSchema,
    },
    {
      meta: {
        id: 'branchRulesetPresetIds',
        category: 'rulesets',
        label: 'Branch ruleset presets',
        sensitivity: 'medium',
        description:
          'Named Backstage-managed repository rules applied to refs — desired state selects which presets remain.',
        ui: {
          control: 'presetChecklist',
        },
      },
      schema: z.array(z.string().min(1)),
    },
  ];
}

function securityToggleSchema() {
  return z.enum(['enabled', 'disabled']);
}

export function securityAnalysisRegistrations(): RepoSettingRegistration[] {
  const secToggle = securityToggleSchema();
  return [
    {
      meta: {
        id: 'vulnerabilityAlerts',
        category: 'security',
        label: 'Dependency vulnerability alerts',
        sensitivity: 'medium',
        description:
          'Enable/disable dependency graph vulnerability alerts notifications.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'secretScanning',
        category: 'security',
        label: 'Secret scanning',
        sensitivity: 'medium',
        description:
          'Enable secret scanning (via security_and_analysis on repos.update).',
        ui: {
          control: 'select',
          options: [
            { value: 'enabled', label: 'Enabled' },
            { value: 'disabled', label: 'Disabled' },
          ],
        },
      },
      schema: secToggle,
    },
    {
      meta: {
        id: 'secretScanningPushProtection',
        category: 'security',
        label: 'Secret scanning push protection',
        sensitivity: 'medium',
        description: 'Push protection for leaked secrets attempts.',
        ui: {
          control: 'select',
          options: [
            { value: 'enabled', label: 'Enabled' },
            { value: 'disabled', label: 'Disabled' },
          ],
        },
      },
      schema: secToggle,
    },
    {
      meta: {
        id: 'dependabotSecurityUpdates',
        category: 'security',
        label: 'Dependabot security updates',
        sensitivity: 'medium',
        description: 'Automatically open Dependabot security pull requests.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
  ];
}

export function actionsPagesRegistrations(): RepoSettingRegistration[] {
  return [
    {
      meta: {
        id: 'actionsEnabled',
        category: 'actions',
        label: 'GitHub Actions restrictions',
        sensitivity: 'medium',
        description:
          'Whether Actions runs and whether only selected actions execute.',
        ui: {
          control: 'actionsPermissions',
        },
      },
      schema: githubActionsRepoPermissionsPayloadSchema,
    },
    {
      meta: {
        id: 'defaultWorkflowPermissions',
        category: 'actions',
        label: 'Default workflow permissions',
        sensitivity: 'medium',
        description:
          'Default GITHUB_TOKEN permissions for workflows in this repo.',
        ui: {
          control: 'workflowPermissions',
        },
      },
      schema: githubWorkflowPermissionsPayloadSchema,
    },
    {
      meta: {
        id: 'pages',
        category: 'pages',
        label: 'GitHub Pages',
        sensitivity: 'medium',
        description:
          'Configure Pages build type plus legacy publishing branch.',
        ui: {
          control: 'pagesConfig',
        },
      },
      schema: githubPagesConfigSchema,
    },
  ];
}

export function integrationResourceRegistrations(): RepoSettingRegistration[] {
  return [
    {
      meta: {
        id: 'webhooks',
        category: 'webhooks',
        label: 'Webhooks',
        sensitivity: 'high',
        description:
          'Webhook endpoints (desired state); secrets rotate during diff operations only.',
        ui: {
          control: 'webhookList',
        },
      },
      schema: webhooksSchema,
    },
    {
      meta: {
        id: 'deployKeys',
        category: 'deployKeys',
        label: 'Deploy keys',
        sensitivity: 'high',
        description:
          'Desired SSH deploy keys; diff creates missing keys.',
        ui: {
          control: 'deployKeyList',
        },
      },
      schema: deployKeysSchema,
    },
    {
      meta: {
        id: 'environments',
        category: 'environments',
        label: 'Environments',
        sensitivity: 'high',
        description:
          'Simplified declarative mappings for GitHub Deployment Environments.',
        ui: {
          control: 'environmentList',
        },
      },
      schema: environmentsSchema,
    },
  ];
}

export function accessSecretsRegistrations(): RepoSettingRegistration[] {
  return [
    {
      meta: {
        id: 'collaborators',
        category: 'access',
        label: 'Outside collaborators',
        sensitivity: 'high',
        description:
          'User accounts with direct repository access.',
        ui: {
          control: 'collaboratorList',
        },
      },
      schema: collaboratorsSchema,
    },
    {
      meta: {
        id: 'teamAccess',
        category: 'access',
        label: 'Team access',
        sensitivity: 'high',
        description:
          'Organization teams with repository access.',
        ui: {
          control: 'collaboratorList',
        },
      },
      schema: teamAccessSchema,
    },
    {
      meta: {
        id: 'actionsSecrets',
        category: 'secrets',
        label: 'Actions secrets',
        sensitivity: 'high',
        description:
          'Rotate GitHub Actions secrets (encrypted before sending to GitHub).',
        ui: {
          control: 'secretRotateList',
        },
      },
      schema: actionsSecretsRotateSchema,
    },
    {
      meta: {
        id: 'dependabotSecrets',
        category: 'secrets',
        label: 'Dependabot secrets',
        sensitivity: 'high',
        description:
          'Rotate Dependabot repository secrets similarly to Actions.',
        ui: {
          control: 'secretRotateList',
        },
      },
      schema: dependabotSecretsRotateSchema,
    },
  ];
}
