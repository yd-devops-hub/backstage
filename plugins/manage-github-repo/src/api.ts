import {
  createApiFactory,
  createApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';

import type {
  BranchRulesetPresetOption,
  CreateGithubRepoPayload,
  GithubOrgOption,
  RepoSettingUiDefinition,
  RepoSettingsSnapshot,
  RepoSummary,
  GithubTeamOption,
} from './types';

export type GithubRepoManagementApi = {
  listBranchRulesetPresets(): Promise<{ items: BranchRulesetPresetOption[] }>;
  listRepoSettingDefinitions(): Promise<{ items: RepoSettingUiDefinition[] }>;
  listGithubOrgs(): Promise<{ items: GithubOrgOption[] }>;
  listGithubTeams(org: string): Promise<{ items: GithubTeamOption[] }>;
  getRepo(owner: string, repo: string): Promise<RepoSettingsSnapshot>;
  createRepo(payload: CreateGithubRepoPayload): Promise<RepoSummary>;
};

export const manageGithubRepoApiRef = createApiRef<GithubRepoManagementApi>({
  id: 'plugin.manage-github-repo.service',
});

class GithubRepoManagementClient implements GithubRepoManagementApi {
  constructor(
    private readonly options: { fetch: typeof fetchApiRef.T.fetch },
  ) {}

  private async parseResponse(
    response: Response,
  ): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    if (!response.ok) {
      const message =
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof (body as { error: unknown }).error === 'string'
          ? (body as { error: string }).error
          : `Request failed (${response.status})`;
      return { ok: false, error: message };
    }
    return { ok: true, data: body };
  }

  async listGithubOrgs(): Promise<{ items: GithubOrgOption[] }> {
    const parsed = await this.parseResponse(
      await this.options.fetch(
        'plugin://manage-github-repo/meta/github-orgs',
      ),
    );
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as { items: GithubOrgOption[] };
  }

  async listGithubTeams(org: string): Promise<{ items: GithubTeamOption[] }> {
    const parsed = await this.parseResponse(
      await this.options.fetch(
        `plugin://manage-github-repo/meta/github-teams/${encodeURIComponent(org)}`,
      ),
    );
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as { items: GithubTeamOption[] };
  }

  async listRepoSettingDefinitions(): Promise<{
    items: RepoSettingUiDefinition[];
  }> {
    const parsed = await this.parseResponse(
      await this.options.fetch(
        'plugin://manage-github-repo/meta/repo-setting-definitions',
      ),
    );
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as { items: RepoSettingUiDefinition[] };
  }

  async listBranchRulesetPresets(): Promise<{
    items: BranchRulesetPresetOption[];
  }> {
    const parsed = await this.parseResponse(
      await this.options.fetch(
        'plugin://manage-github-repo/meta/branch-ruleset-presets',
      ),
    );
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as { items: BranchRulesetPresetOption[] };
  }

  async getRepo(
    owner: string,
    repo: string,
  ): Promise<RepoSettingsSnapshot> {
    const parsed = await this.parseResponse(
      await this.options.fetch(
        `plugin://manage-github-repo/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      ),
    );
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as RepoSettingsSnapshot;
  }

  async createRepo(
    payload: CreateGithubRepoPayload,
  ): Promise<RepoSummary> {
    const parsed = await this.parseResponse(
      await this.options.fetch('plugin://manage-github-repo/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as RepoSummary;
  }
}

export const manageGithubRepoApiFactory = createApiFactory({
  api: manageGithubRepoApiRef,
  deps: { fetchApi: fetchApiRef },
  factory: ({ fetchApi }) =>
    new GithubRepoManagementClient({ fetch: fetchApi.fetch }),
});
