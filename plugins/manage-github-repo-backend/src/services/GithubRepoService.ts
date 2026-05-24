import { Octokit } from '@octokit/rest';
import {
  readGithubIntegrationConfigs,
  SingleInstanceGithubCredentialsProvider,
  type GithubCredentialsProvider,
  type GithubIntegrationConfig,
} from '@backstage/integration';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import { InputError } from '@backstage/errors';
import {
  BRANCH_RULESET_PRESET_META,
  type RepoSettingsSnapshot,
  type RepoSummary,
} from '@internal/backstage-plugin-manage-github-repo-common';

import type { CreateRepoBody, GithubRepoSettings } from '../schemas/repoSchemas';
import {
  DEFAULT_REPO_CREATION_RULESET,
} from '../rulesets/defaultRepoCreationRuleset';
import { applyGithubRepoSettings } from '../settings/applyRepoSettings';
import { buildRepoSettingsSnapshot } from '../settings/readRepoSnapshot';
import {
  loadRulesetNameMap,
  upsertRepoRulesetPayload,
} from '../settings/rulesetSync';

export type { RepoSummary, RepoSettingsSnapshot };

export type BranchRulesetPresetDescription = {
  id: string;
  description: string;
};

export type GithubTeamSummary = {
  slug: string;
  name: string;
};

export type GithubOrgSummary = {
  login: string;
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

function resolveConfiguredOrgs(config: Config): string[] {
  const orgs = new Set<string>();

  for (const org of config.getOptionalStringArray(
    'catalog.providers.githubOrg.orgs',
  ) ?? []) {
    orgs.add(org);
  }

  const flatGithubOrgKeys = new Set(['id', 'githubUrl', 'orgs', 'schedule']);

  const githubOrgProviders = config.getOptionalConfig(
    'catalog.providers.githubOrg',
  );
  if (githubOrgProviders) {
    for (const key of githubOrgProviders.keys()) {
      if (flatGithubOrgKeys.has(key)) {
        continue;
      }
      const providerConfig = githubOrgProviders.getOptionalConfig(key);
      if (!providerConfig) {
        continue;
      }
      const org = providerConfig.getOptionalString('organization');
      if (org) {
        orgs.add(org);
      }
    }
  }

  const githubProviders = config.getOptionalConfig('catalog.providers.github');
  if (githubProviders) {
    for (const key of githubProviders.keys()) {
      const providerConfig = githubProviders.getOptionalConfig(key);
      if (!providerConfig) {
        continue;
      }
      const org = providerConfig.getOptionalString('organization');
      if (org) {
        orgs.add(org);
      }
    }
  }

  if (orgs.size === 0) {
    orgs.add(resolveDefaultOrg(config));
  }

  return [...orgs].sort((a, b) => a.localeCompare(b));
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

function settingsPayloadContainsWork(settings?: GithubRepoSettings): boolean {
  if (!settings) {
    return false;
  }
  return Object.entries(settings).some(([, value]) => {
    if (value === undefined || value === null) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value as object).length > 0;
    }
    return true;
  });
}

export class GithubRepoService {
  private readonly githubIntegration: GithubIntegration | undefined;
  private readonly defaultOrg: string;
  private readonly configuredOrgs: string[];

  constructor(options: { logger: LoggerService; config: Config }) {
    const { logger, config } = options;
    this.githubIntegration = pickGithubIntegration(config, logger);
    this.defaultOrg = resolveDefaultOrg(config);
    this.configuredOrgs = resolveConfiguredOrgs(config);
  }

  listBranchRulesetPresets(): { items: BranchRulesetPresetDescription[] } {
    return {
      items: BRANCH_RULESET_PRESET_META.map(({ id, description }) => ({
        id,
        description,
      })),
    };
  }

  async listGithubOrgs(
    logger: LoggerService,
  ): Promise<{ items: GithubOrgSummary[] }> {
    const items: GithubOrgSummary[] = [];

    for (const org of this.configuredOrgs) {
      try {
        const octokit = await this.getOctokit(org);
        await octokit.rest.orgs.get({ org });
        items.push({ login: org });
      } catch (_error) {
        logger.warn(
          `Configured GitHub org "${org}" is unavailable for Backstage repo creation`,
        );
      }
    }

    if (items.length === 0) {
      throw new InputError(
        'No GitHub organizations are available. Verify integrations.github and catalog.providers.githubOrg configuration.',
      );
    }

    return { items };
  }

  async listGithubTeams(org: string): Promise<{ items: GithubTeamSummary[] }> {
    const trimmedOrg = org.trim();
    if (!trimmedOrg.length) {
      throw new InputError('Organization is required');
    }

    const octokit = await this.getOctokit(trimmedOrg);
    const items: GithubTeamSummary[] = [];

    for await (const response of octokit.paginate.iterator(
      octokit.rest.teams.list,
      { org: trimmedOrg, per_page: 100 },
    )) {
      for (const team of response.data) {
        if (team.slug) {
          items.push({ slug: team.slug, name: team.name });
        }
      }
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items };
  }

  private async getOctokit(orgOrOwner: string): Promise<Octokit> {
    if (!this.githubIntegration) {
      throw new InputError(
        'GitHub integration is not configured. Add integrations.github with a GitHub App or token.',
      );
    }

    const { integrationConfig, credentials } = this.githubIntegration;
    const credentialsUrl = `https://${integrationConfig.host}/${orgOrOwner}`;

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

  async getRepository(
    owner: string,
    repo: string,
  ): Promise<RepoSettingsSnapshot> {
    const octokit = await this.getOctokit(owner);
    return buildRepoSettingsSnapshot(octokit, owner, repo);
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

    const ownerSlug = created.data.owner.login;
    const repoSlug = created.data.name;

    if (!body.skipDefaultBranchRuleset) {
      logger.info(
        `Applying default branch ruleset "${DEFAULT_REPO_CREATION_RULESET.name}" on ${ownerSlug}/${repoSlug}`,
      );
      const rulesetMap = await loadRulesetNameMap(octokit, ownerSlug, repoSlug);
      await upsertRepoRulesetPayload(
        octokit,
        ownerSlug,
        repoSlug,
        DEFAULT_REPO_CREATION_RULESET,
        rulesetMap,
        logger,
      );
    }

    const settings = body.settings;
    if (settingsPayloadContainsWork(settings) && settings) {
      logger.info(`Applying supplemental settings during create`);
      await applyGithubRepoSettings(
        octokit,
        ownerSlug,
        repoSlug,
        settings,
        logger,
      );
      const refreshed = await buildRepoSettingsSnapshot(
        octokit,
        ownerSlug,
        repoSlug,
      );
      return refreshed.summary;
    }

    return {
      owner: ownerSlug,
      name: repoSlug,
      fullName: created.data.full_name ?? `${ownerSlug}/${repoSlug}`,
      defaultBranch: created.data.default_branch ?? '',
      deleteBranchOnMerge: Boolean(created.data.delete_branch_on_merge),
      htmlUrl: created.data.html_url ?? '',
      private: Boolean(created.data.private),
    };
  }

  async updateRepository(
    owner: string,
    repo: string,
    settings: GithubRepoSettings,
    logger: LoggerService,
  ): Promise<RepoSummary> {
    logger.info(`Updating GitHub repository ${owner}/${repo}`);
    const octokit = await this.getOctokit(owner);
    await applyGithubRepoSettings(octokit, owner, repo, settings, logger);
    const refreshed = await buildRepoSettingsSnapshot(octokit, owner, repo);
    logger.info(`Repo ${owner}/${repo} refresh complete (${refreshed.fullName})`);
    return refreshed.summary;
  }

  async applyDefaultRepoCreationRuleset(
    owner: string,
    repo: string,
    logger: LoggerService,
  ): Promise<void> {
    const octokit = await this.getOctokit(owner);
    const map = await loadRulesetNameMap(octokit, owner, repo);
    await upsertRepoRulesetPayload(
      octokit,
      owner,
      repo,
      DEFAULT_REPO_CREATION_RULESET,
      map,
      logger,
    );
  }

  /** @deprecated Prefer `applyGithubRepoSettings` via orchestrator/service call graph. */
  async applyRepoSettings(
    owner: string,
    repo: string,
    settings: GithubRepoSettings,
    logger: LoggerService,
  ): Promise<void> {
    const octokit = await this.getOctokit(owner);
    await applyGithubRepoSettings(octokit, owner, repo, settings, logger);
  }
}
