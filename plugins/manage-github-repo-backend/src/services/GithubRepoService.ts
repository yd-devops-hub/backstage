import { Octokit } from '@octokit/rest';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import {
  readGithubIntegrationConfigs,
  SingleInstanceGithubCredentialsProvider,
  type GithubCredentialsProvider,
  type GithubIntegrationConfig,
} from '@backstage/integration';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import { InputError } from '@backstage/errors';

import type { CreateRepoBody, GithubRepoSettings } from '../schemas/repoSchemas';
import {
  DEFAULT_REPO_CREATION_RULESET,
  type RepoRulesetUpsertPayload,
} from '../rulesets/defaultRepoCreationRuleset';
import {
  BRANCH_RULESET_PRESET_IDS,
  BRANCH_RULESET_PRESET_META,
  buildBranchRulesetPreset,
} from '../rulesets/branchRulesetPresets';

export type RepoSummary = {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  deleteBranchOnMerge: boolean;
  htmlUrl: string;
  private: boolean;
};

export type BranchRulesetPresetDescription = {
  id: string;
  description: string;
};

type GithubIntegration = {
  integrationConfig: GithubIntegrationConfig;
  credentials: GithubCredentialsProvider;
};

function pickGithubIntegration(
  config: Config,
  logger: LoggerService,
): GithubIntegration | undefined {
  const githubConfigs = readGithubIntegrationConfigs(
    config.getOptionalConfigArray('integrations.github') ?? [],
  );

  const primaryGithubConfig =
    githubConfigs.find(c => c.host === 'github.com') ?? githubConfigs[0];

  if (!primaryGithubConfig) {
    logger.warn(
      'manage-github-repo: integrations.github is not configured; GitHub repo APIs will fail until configured.',
    );
    return undefined;
  }

  return {
    integrationConfig: primaryGithubConfig,
    credentials:
      SingleInstanceGithubCredentialsProvider.create(primaryGithubConfig),
  };
}

function resolveDefaultOrg(config: Config): string {
  return (
    config.getOptionalString(
      'catalog.providers.githubOrg.ydDevopsOrgProvider.organization',
    ) ??
    config.getOptionalStringArray('catalog.providers.githubOrg.orgs')?.[0] ??
    config.getOptionalString(
      'catalog.providers.github.yd-devops-hub.organization',
    ) ??
    'yd-devops-hub'
  );
}

export class GithubRepoService {
  private readonly githubIntegration: GithubIntegration | undefined;
  private readonly defaultOrg: string;

  constructor(options: { logger: LoggerService; config: Config }) {
    const { logger, config } = options;
    this.githubIntegration = pickGithubIntegration(config, logger);
    this.defaultOrg = resolveDefaultOrg(config);
  }

  listBranchRulesetPresets(): { items: BranchRulesetPresetDescription[] } {
    return {
      items: BRANCH_RULESET_PRESET_META.map(({ id, description }) => ({
        id,
        description,
      })),
    };
  }

  private async getOctokit(org: string): Promise<Octokit> {
    if (!this.githubIntegration) {
      throw new InputError(
        'GitHub integration is not configured. Add integrations.github with a GitHub App or token.',
      );
    }

    const { integrationConfig, credentials } = this.githubIntegration;
    const credentialsUrl = `https://${integrationConfig.host}/${org}`;

    const { token } = await credentials.getCredentials({
      url: credentialsUrl,
    });

    if (!token) {
      throw new InputError(
        'Could not obtain GitHub credentials for this organization. Verify the GitHub App is installed on the org.',
      );
    }

    return new Octokit({
      auth: token,
      ...(integrationConfig.apiBaseUrl
        ? { baseUrl: integrationConfig.apiBaseUrl }
        : {}),
    });
  }

  private toSummary(repo: {
    name: string;
    full_name?: string;
    owner: { login: string };
    default_branch?: string | null;
    delete_branch_on_merge?: boolean | null;
    html_url?: string;
    private?: boolean;
  }): RepoSummary {
    return {
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name ?? `${repo.owner.login}/${repo.name}`,
      defaultBranch: repo.default_branch ?? '',
      deleteBranchOnMerge: Boolean(repo.delete_branch_on_merge),
      htmlUrl: repo.html_url ?? '',
      private: Boolean(repo.private),
    };
  }

  async getRepository(owner: string, repo: string): Promise<RepoSummary> {
    const octokit = await this.getOctokit(owner);
    const res = await octokit.rest.repos.get({ owner, repo });
    return this.toSummary(res.data);
  }

  async createRepository(
    body: CreateRepoBody,
    logger: LoggerService,
  ): Promise<RepoSummary> {
    const org = body.org ?? this.defaultOrg;
    const octokit = await this.getOctokit(org);

    logger.info(`Creating GitHub repository "${body.name}" in org ${org}`);

    const created = await octokit.rest.repos.createInOrg({
      org,
      name: body.name,
      description: body.description,
      private: body.private,
      auto_init: body.autoInit ?? true,
    });

    const owner = created.data.owner.login;
    const repoName = created.data.name;

    if (!body.skipDefaultBranchRuleset) {
      logger.info(
        `Applying default branch ruleset "${DEFAULT_REPO_CREATION_RULESET.name}" on ${owner}/${repoName}`,
      );
      const rulesetMap = await this.loadRulesetNameMap(octokit, owner, repoName);
      await this.upsertRepoRulesetPayload(
        octokit,
        owner,
        repoName,
        DEFAULT_REPO_CREATION_RULESET,
        rulesetMap,
        logger,
      );
    }

    const settings = body.settings;
    const hasSettings =
      settings &&
      (settings.defaultBranch !== undefined ||
        settings.deleteBranchOnMerge !== undefined ||
        (settings.branchRulesetPresetIds?.length ?? 0) > 0);

    if (hasSettings && settings) {
      await this.applyRepoSettings(owner, repoName, settings, logger);
      const refreshed = await octokit.rest.repos.get({
        owner,
        repo: repoName,
      });
      return this.toSummary(refreshed.data);
    }

    return this.toSummary(created.data);
  }

  async updateRepository(
    owner: string,
    repo: string,
    settings: GithubRepoSettings,
    logger: LoggerService,
  ): Promise<RepoSummary> {
    logger.info(`Updating GitHub repository ${owner}/${repo}`);
    await this.applyRepoSettings(owner, repo, settings, logger);
    const octokit = await this.getOctokit(owner);
    const refreshed = await octokit.rest.repos.get({ owner, repo });
    return this.toSummary(refreshed.data);
  }

  /**
   * Applies the default branch ruleset (see defaultRepoCreationRuleset.ts) to an existing repository.
   * Used by Software Templates after `publish:github`.
   */
  async applyDefaultRepoCreationRuleset(
    owner: string,
    repo: string,
    logger: LoggerService,
  ): Promise<void> {
    const octokit = await this.getOctokit(owner);
    const map = await this.loadRulesetNameMap(octokit, owner, repo);
    await this.upsertRepoRulesetPayload(
      octokit,
      owner,
      repo,
      DEFAULT_REPO_CREATION_RULESET,
      map,
      logger,
    );
  }

  /**
   * Applies settings additively: omitted fields are left unchanged on GitHub.
   * Branch rulesets are created or updated when `branchRulesetPresetIds` is non-empty.
   */
  async applyRepoSettings(
    owner: string,
    repo: string,
    settings: GithubRepoSettings,
    logger: LoggerService,
  ): Promise<void> {
    const octokit = await this.getOctokit(owner);

    if (
      settings.defaultBranch !== undefined ||
      settings.deleteBranchOnMerge !== undefined
    ) {
      await octokit.rest.repos.update({
        owner,
        repo,
        ...(settings.defaultBranch !== undefined
          ? { default_branch: settings.defaultBranch }
          : {}),
        ...(settings.deleteBranchOnMerge !== undefined
          ? { delete_branch_on_merge: settings.deleteBranchOnMerge }
          : {}),
      });
    }

    const repoInfo = await octokit.rest.repos.get({ owner, repo });
    const branchForRulesets =
      settings.defaultBranch ?? repoInfo.data.default_branch ?? 'main';

    if (settings.branchRulesetPresetIds?.length) {
      await this.syncBranchRulesetPresets(
        octokit,
        owner,
        repo,
        branchForRulesets,
        settings.branchRulesetPresetIds,
        logger,
      );
    }
  }

  private async loadRulesetNameMap(
    octokit: Octokit,
    owner: string,
    repo: string,
  ): Promise<Map<string, { id: number }>> {
    const { data: rulesets } = await octokit.rest.repos.getRepoRulesets({
      owner,
      repo,
    });
    const byName = new Map<string, { id: number }>();
    for (const r of rulesets) {
      if (typeof r.name === 'string' && r.id !== undefined) {
        byName.set(r.name, { id: r.id });
      }
    }
    return byName;
  }

  private async upsertRepoRulesetPayload(
    octokit: Octokit,
    owner: string,
    repo: string,
    payload: RepoRulesetUpsertPayload,
    byName: Map<string, { id: number }>,
    logger: LoggerService,
  ): Promise<void> {
    const existing = byName.get(payload.name);
    if (existing !== undefined) {
      logger.info(`Updating ruleset "${payload.name}" on ${owner}/${repo}`);
      await octokit.rest.repos.updateRepoRuleset({
        owner,
        repo,
        ruleset_id: existing.id,
        ...payload,
      } as RestEndpointMethodTypes['repos']['updateRepoRuleset']['parameters']);
    } else {
      logger.info(`Creating ruleset "${payload.name}" on ${owner}/${repo}`);
      const created = await octokit.rest.repos.createRepoRuleset({
        owner,
        repo,
        ...payload,
      } as RestEndpointMethodTypes['repos']['createRepoRuleset']['parameters']);
      if (created.data.name && created.data.id !== undefined) {
        byName.set(created.data.name, { id: created.data.id });
      }
    }
  }

  private async syncBranchRulesetPresets(
    octokit: Octokit,
    owner: string,
    repo: string,
    branchName: string,
    presetIds: string[],
    logger: LoggerService,
  ): Promise<void> {
    const byName = await this.loadRulesetNameMap(octokit, owner, repo);

    for (const presetId of presetIds) {
      if (!BRANCH_RULESET_PRESET_IDS.has(presetId)) {
        throw new InputError(`Unknown branch ruleset preset: ${presetId}`);
      }

      const rulesetPayload = buildBranchRulesetPreset(presetId, branchName);
      await this.upsertRepoRulesetPayload(
        octokit,
        owner,
        repo,
        rulesetPayload,
        byName,
        logger,
      );
    }
  }
}
