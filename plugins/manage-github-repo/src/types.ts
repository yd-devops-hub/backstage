import type { ApprovalRequestDto } from '@internal/backstage-plugin-approvals';
import type {
  GithubRepoSettings,
  RepoSettingUiDefinition,
  RepoSummary,
  RepoSettingsSnapshot,
} from '@internal/backstage-plugin-manage-github-repo-common';

/** flattened GitHub identifiers for UX chrome */
export type GithubRepoIdentifiers = RepoSummary;

export type {
  RepoSettingsSnapshot,
  GithubRepoSettings,
  RepoSettingUiDefinition,
};

export type GithubRepoSettingsPayload = GithubRepoSettings;

export type GithubOrgOption = {
  login: string;
};

export type GithubTeamOption = {
  slug: string;
  name: string;
};

export type BranchRulesetPresetOption = {
  id: string;
  description: string;
};

export type CreateGithubRepoPayload = {
  org?: string;
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
  skipDefaultBranchRuleset?: boolean;
  settings?: GithubRepoSettingsPayload;
};

export type RepoSettingsUpdateSubmittedResponse = Pick<
  ApprovalRequestDto,
  'id' | 'status' | 'actionType' | 'createdAt'
>;

export type RepoSettingsUpdateSubmitResult =
  | { ok: true; data: RepoSettingsUpdateSubmittedResponse }
  | { ok: false; error: string };
