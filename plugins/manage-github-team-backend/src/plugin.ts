import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';
import { Router } from 'express';
import express from 'express';
import { Octokit } from '@octokit/rest';
import {
  readGithubIntegrationConfigs,
  SingleInstanceGithubCredentialsProvider,
  type GithubCredentialsProvider,
  type GithubIntegrationConfig,
} from '@backstage/integration';

export const manageGithubTeamPlugin = createBackendPlugin({
  pluginId: 'manage-github-team',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
      },
      async init({ logger, httpRouter, config }) {
        const router = Router();
        router.use(express.json());

        const githubConfigs = readGithubIntegrationConfigs(
          config.getOptionalConfigArray('integrations.github') ?? [],
        );

        const primaryGithubConfig =
          githubConfigs.find(c => c.host === 'github.com') ?? githubConfigs[0];

        let githubIntegration:
          | {
              integrationConfig: GithubIntegrationConfig;
              credentials: GithubCredentialsProvider;
            }
          | undefined;

        if (primaryGithubConfig) {
          githubIntegration = {
            integrationConfig: primaryGithubConfig,
            credentials:
              SingleInstanceGithubCredentialsProvider.create(primaryGithubConfig),
          };
        } else {
          logger.warn(
            'manage-github-team: integrations.github is not configured; POST /create-team will respond with errors until it is added.',
          );
        }

        const organization =
          config.getOptionalString(
            'catalog.providers.githubOrg.ydDevopsOrgProvider.organization',
          ) ??
          config.getOptionalStringArray('catalog.providers.githubOrg.orgs')?.[0] ??
          config.getOptionalString('catalog.providers.github.yd-devops-hub.organization') ??
          'yd-devops-hub';

        router.post('/create-team', async (req, res) => {
          const body = req.body as {
            teamName?: unknown;
            description?: unknown;
          };

          if (
            typeof body.teamName !== 'string' ||
            !body.teamName.trim()
          ) {
            res.status(400).json({ error: 'Missing required field: teamName' });
            return;
          }

          const teamName = body.teamName.trim();

          if (!githubIntegration) {
            res.status(503).json({
              error:
                'GitHub integration is not configured. Add integrations.github with a GitHub App or token.',
            });
            return;
          }

          try {
            logger.info(
              `Initiating GitHub team creation: "${teamName}" inside ${organization}`,
            );

            const { integrationConfig } = githubIntegration;
            const credentialsUrl = `https://${integrationConfig.host}/${organization}`;

            const { token } = await githubIntegration.credentials.getCredentials({
              url: credentialsUrl,
            });

            if (!token) {
              res.status(503).json({
                error:
                  'Could not obtain GitHub credentials for this organization. Verify the GitHub App is installed on the org.',
              });
              return;
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

            const githubResponse = await octokit.rest.teams.create({
              org: organization,
              name: teamName,
              description: descriptionText,
              privacy: 'closed',
            });

            logger.info(
              `Successfully created team "${teamName}" with ID: ${githubResponse.data.id}`,
            );

            res.status(201).json({
              message: `Successfully initiated creation for team: ${teamName}`,
              org: organization,
              githubTeamId: githubResponse.data.id,
              htmlUrl: githubResponse.data.html_url,
            });
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            logger.error(`Failed to create GitHub team: ${message}`);
            res.status(500).json({ error: message });
          }
        });

        httpRouter.use(router);
      },
    });
  },
});
