import { z } from 'zod';

import type { RepoSettingRegistration } from '../types';

const visibilityEnum = z.enum(['public', 'private', 'internal']);

export function generalReposUpdateRegistrations(): RepoSettingRegistration[] {
  return [
    {
      meta: {
        id: 'description',
        category: 'general',
        label: 'Description',
        description:
          'A short repository description displayed on GitHub.',
        sensitivity: 'low',
        ui: {
          control: 'textarea',
          placeholder: 'Service description…',
        },
      },
      schema: z.string().max(4096),
    },
    {
      meta: {
        id: 'homepage',
        category: 'general',
        label: 'Homepage URL',
        description: 'Website link shown on the repository home page.',
        sensitivity: 'low',
        ui: { control: 'text', placeholder: 'https://…' },
      },
      schema: z.string().max(1000),
    },
    {
      meta: {
        id: 'visibility',
        category: 'general',
        label: 'Visibility',
        description:
          'Public, private, or internal (Enterprise). Subject to organization policy.',
        sensitivity: 'high',
        ui: {
          control: 'select',
          options: [
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
            { value: 'internal', label: 'Internal' },
          ],
        },
      },
      schema: visibilityEnum,
    },
    {
      meta: {
        id: 'isTemplate',
        category: 'general',
        label: 'Template repository',
        description:
          'Other users can use this repository as a GitHub repository template.',
        sensitivity: 'medium',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'archived',
        category: 'general',
        label: 'Archived',
        description:
          'Read-only archival state — restricts mutating workflows on GitHub.',
        sensitivity: 'high',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'defaultBranch',
        category: 'general',
        label: 'Default branch',
        description:
          'The branch must exist before switching the default.',
        sensitivity: 'medium',
        ui: { control: 'text', placeholder: 'main' },
      },
      schema: z.string().min(1).max(255),
    },
  ];
}

export function mergeReposUpdateRegistrations(): RepoSettingRegistration[] {
  return [
    {
      meta: {
        id: 'deleteBranchOnMerge',
        category: 'merge',
        label: 'Automatically delete head branches after merges',
        sensitivity: 'low',
        description:
          'When pull requests merge, delete the merged head branch.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'allowMergeCommit',
        category: 'merge',
        label: 'Allow merge commits',
        sensitivity: 'low',
        description: 'Allow merging pull requests via merge commits.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'allowSquashMerge',
        category: 'merge',
        label: 'Allow squash merging',
        sensitivity: 'low',
        description: 'Allow merging pull requests with squash merges.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'allowRebaseMerge',
        category: 'merge',
        label: 'Allow rebase merging',
        sensitivity: 'low',
        description: 'Allow merging pull requests via rebase-only merges.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'allowAutoMerge',
        category: 'merge',
        label: 'Allow auto-merge',
        sensitivity: 'low',
        description:
          'Allow pull requests queued for auto-merge to finish without manual merges.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'allowUpdateBranch',
        category: 'merge',
        label: 'Suggest updating pull request branches',
        sensitivity: 'low',
        description:
          'Show quick actions from the GitHub UI to update PR branches.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'squashMergeCommitTitle',
        category: 'merge',
        label: 'Squash merge commit title',
        sensitivity: 'low',
        description:
          'Default title format GitHub proposes for squash merge commits.',
        ui: {
          control: 'select',
          options: [
            { value: 'PR_TITLE', label: 'Pull request title' },
            {
              value: 'COMMIT_OR_PR_TITLE',
              label: 'Commit or pull request title',
            },
          ],
        },
      },
      schema: z.enum(['PR_TITLE', 'COMMIT_OR_PR_TITLE']),
    },
    {
      meta: {
        id: 'squashMergeCommitMessage',
        category: 'merge',
        label: 'Squash merge commit message',
        sensitivity: 'low',
        description:
          'Message body preference when squash merging.',
        ui: {
          control: 'select',
          options: [
            { value: 'PR_BODY', label: 'Pull request body' },
            { value: 'COMMIT_MESSAGES', label: 'Commit messages' },
            { value: 'BLANK', label: 'Blank message' },
          ],
        },
      },
      schema: z.enum(['PR_BODY', 'COMMIT_MESSAGES', 'BLANK']),
    },
    {
      meta: {
        id: 'mergeCommitTitle',
        category: 'merge',
        label: 'Merge commit default title',
        sensitivity: 'low',
        description:
          'Default title format GitHub proposes for merge commits.',
        ui: {
          control: 'select',
          options: [
            { value: 'PR_TITLE', label: 'Pull request title' },
            {
              value: 'MERGE_MESSAGE',
              label: 'GitHub merge message headline',
            },
          ],
        },
      },
      schema: z.enum(['PR_TITLE', 'MERGE_MESSAGE']),
    },
    {
      meta: {
        id: 'mergeCommitMessage',
        category: 'merge',
        label: 'Merge commit default message',
        sensitivity: 'low',
        description:
          'Message body formatting for ordinary merge commits.',
        ui: {
          control: 'select',
          options: [
            { value: 'PR_BODY', label: 'Pull request body plus title info' },
            { value: 'BLANK', label: 'Blank body' },
            { value: 'PR_TITLE', label: 'Title only as body text' },
          ],
        },
      },
      schema: z.enum(['PR_BODY', 'BLANK', 'PR_TITLE']),
    },
    {
      meta: {
        id: 'webCommitSignoffRequired',
        category: 'merge',
        label: 'Require sign-off on web commits',
        sensitivity: 'low',
        description:
          'Adds the Signed-off-by trailer for commits authored in the GitHub UI.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
  ];
}

export function featureReposUpdateRegistrations(): RepoSettingRegistration[] {
  return [
    {
      meta: {
        id: 'hasIssues',
        category: 'features',
        label: 'Issues',
        sensitivity: 'low',
        description: 'Enable GitHub Issues.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'hasProjects',
        category: 'features',
        label: 'Projects',
        sensitivity: 'low',
        description: 'Enable Projects for this repository when available.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'hasWiki',
        category: 'features',
        label: 'Wiki',
        sensitivity: 'low',
        description: 'Enable Wikis.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
    {
      meta: {
        id: 'hasDiscussions',
        category: 'features',
        label: 'Discussions',
        sensitivity: 'low',
        description: 'Enable Discussions.',
        ui: { control: 'boolean' },
      },
      schema: z.boolean(),
    },
  ];
}
