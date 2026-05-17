import {
  createApiFactory,
  createApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';

import type {
  BranchRulesetPresetOption,
  CreateGithubRepoPayload,
  GithubRepoSettingsPayload,
  GithubRepoSummary,
} from './types';

/** @public */
export type GithubRepoManagementApi = {
  listBranchRulesetPresets(): Promise<{ items: BranchRulesetPresetOption[] }>;
  getRepo(owner: string, repo: string): Promise<GithubRepoSummary>;
  createRepo(payload: CreateGithubRepoPayload): Promise<GithubRepoSummary>;
  updateRepo(
    owner: string,
    repo: string,
    settings: GithubRepoSettingsPayload,
  ): Promise<GithubRepoSummary>;
};

/** @public */
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

  async listBranchRulesetPresets(): Promise<{
    items: BranchRulesetPresetOption[];
  }> {
    const response = await this.options.fetch(
      'plugin://manage-github-repo/meta/branch-ruleset-presets',
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as { items: BranchRulesetPresetOption[] };
  }

  async getRepo(owner: string, repo: string): Promise<GithubRepoSummary> {
    const response = await this.options.fetch(
      `plugin://manage-github-repo/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as GithubRepoSummary;
  }

  async createRepo(
    payload: CreateGithubRepoPayload,
  ): Promise<GithubRepoSummary> {
    const response = await this.options.fetch(
      'plugin://manage-github-repo/repos',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as GithubRepoSummary;
  }

  async updateRepo(
    owner: string,
    repo: string,
    settings: GithubRepoSettingsPayload,
  ): Promise<GithubRepoSummary> {
    const response = await this.options.fetch(
      `plugin://manage-github-repo/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      },
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return parsed.data as GithubRepoSummary;
  }
}

/** @public */
export const manageGithubRepoApiFactory = createApiFactory({
  api: manageGithubRepoApiRef,
  deps: { fetchApi: fetchApiRef },
  factory: ({ fetchApi }) =>
    new GithubRepoManagementClient({ fetch: fetchApi.fetch }),
});
