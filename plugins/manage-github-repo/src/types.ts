/** Mirrors `RepoSummary` from the manage-github-repo backend. */
export type GithubRepoSummary = {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  deleteBranchOnMerge: boolean;
  htmlUrl: string;
  private: boolean;
};

export type GithubRepoSettingsPayload = {
  defaultBranch?: string;
  deleteBranchOnMerge?: boolean;
  branchRulesetPresetIds?: string[];
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
  /** When true, do not apply the standard default-branch ruleset on create. */
  skipDefaultBranchRuleset?: boolean;
  settings?: GithubRepoSettingsPayload;
};
