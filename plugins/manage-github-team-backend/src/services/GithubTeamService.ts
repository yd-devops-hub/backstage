import { Octokit } from '@octokit/rest';
import {
  readGithubIntegrationConfigs,
  SingleInstanceGithubCredentialsProvider,
  type GithubCredentialsProvider,
  type GithubIntegrationConfig,
} from '@backstage/integration';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import { z } from 'zod/v3';

export const githubTeamCreatePayloadSchema = z.object({
  teamName: z.string().min(1),
  description: z.string().optional(),
});

export type GithubTeamCreatePayload = z.infer<
  typeof githubTeamCreatePayloadSchema
>;

export type GithubTeamCreateResult = {
  message: string;
  org: string;
  githubTeamId: number;
  htmlUrl: string;
};

type GithubIntegration = {
  integrationConfig: GithubIntegrationConfig;
  credentials: GithubCredentialsProvider;
};

/**
 * Creates GitHub teams using the configured GitHub integration (same behavior as the former HTTP route).
 */
export class GithubTeamService {
  private readonly githubIntegration: GithubIntegration | undefined;
  private readonly organization: string;

  constructor(options: {
    logger: LoggerService;
    config: Config;
  }) {
    const { logger, config } = options;
    const githubConfigs = readGithubIntegrationConfigs(
      config.getOptionalConfigArray('integrations.github') ?? [],
    );

    const primaryGithubConfig =
      githubConfigs.find(c => c.host === 'github.com') ?? githubConfigs[0];

    if (primaryGithubConfig) {
      this.githubIntegration = {
        integrationConfig: primaryGithubConfig,
        credentials:
          SingleInstanceGithubCredentialsProvider.create(primaryGithubConfig),
      };
    } else {
      this.githubIntegration = undefined;
      logger.warn(
        'manage-github-team: integrations.github is not configured; team creation will fail until configured.',
      );
    }

    this.organization =
      config.getOptionalString(
        'catalog.providers.githubOrg.ydDevopsOrgProvider.organization',
      ) ??
      config.getOptionalStringArray('catalog.providers.githubOrg.orgs')?.[0] ??
      config.getOptionalString(
        'catalog.providers.github.yd-devops-hub.organization',
      ) ??
      'yd-devops-hub';
  }

  async executeCreateTeam(
    payload: GithubTeamCreatePayload,
    logger: LoggerService,
  ): Promise<GithubTeamCreateResult> {
    const body = githubTeamCreatePayloadSchema.parse(payload);
    const teamName = body.teamName.trim();

    if (!this.githubIntegration) {
      throw new Error(
        'GitHub integration is not configured. Add integrations.github with a GitHub App or token.',
      );
    }

    const { integrationConfig } = this.githubIntegration;
    const credentialsUrl = `https://${integrationConfig.host}/${this.organization}`;

    const { token } = await this.githubIntegration.credentials.getCredentials({
      url: credentialsUrl,
    });

    if (!token) {
      throw new Error(
        'Could not obtain GitHub credentials for this organization. Verify the GitHub App is installed on the org.',
      );
    }

    const octokit = new Octokit({
      auth: token,
      ...(integrationConfig.apiBaseUrl
        ? { baseUrl: integrationConfig.apiBaseUrl }
        : {}),
    });

    const descriptionText =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : 'Managed automatically via Backstage Platform';

    logger.info(
      `Creating GitHub team "${teamName}" in org ${this.organization}`,
    );

    const githubResponse = await octokit.rest.teams.create({
      org: this.organization,
      name: teamName,
      description: descriptionText,
      privacy: 'closed',
    });

    return {
      message: `Successfully created team: ${teamName}`,
      org: this.organization,
      githubTeamId: githubResponse.data.id,
      htmlUrl: githubResponse.data.html_url ?? '',
    };
  }
}
