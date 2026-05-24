import { InputError } from '@backstage/errors';
import type {
  HttpAuthService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { z } from 'zod';
import { getRepoSettingUiDefinitions } from '@internal/backstage-plugin-manage-github-repo-common';
import { GithubRepoService } from './services/GithubRepoService';
import {
  createRepoBodySchema,
  updateRepoBodySchema,
} from './schemas/repoSchemas';

function octokitErrorStatus(err: unknown): number | undefined {
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
  ) {
    return (err as { status: number }).status;
  }
  return undefined;
}

function httpStatusForError(err: unknown): number {
  if (err instanceof InputError) return 400;
  const status = octokitErrorStatus(err);
  if (status !== undefined) return status;
  return 500;
}

export async function createGithubRepoRouter(options: {
  githubRepos: GithubRepoService;
  httpAuth: HttpAuthService;
  logger: LoggerService;
}): Promise<express.Router> {
  const { githubRepos, httpAuth, logger } = options;
  const router = Router();
  router.use(express.json());

  router.get('/meta/branch-ruleset-presets', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user'] });
    res.json(githubRepos.listBranchRulesetPresets());
  });

  router.get('/meta/repo-setting-definitions', async (req, res) => {
    await httpAuth.credentials(req, { allow: ['user'] });
    res.json({ items: getRepoSettingUiDefinitions() });
  });

  router.get('/meta/github-orgs', async (req, res) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      const summary = await githubRepos.listGithubOrgs(logger);
      res.json(summary);
    } catch (err) {
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      if (status >= 500) {
        logger.error(message);
      }
      res.status(status).json({ error: message });
    }
  });

  router.get('/meta/github-teams/:org', async (req, res) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      const summary = await githubRepos.listGithubTeams(req.params.org);
      res.json(summary);
    } catch (err) {
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      if (status >= 500) {
        logger.error(message);
      }
      res.status(status).json({ error: message });
    }
  });

  router.post('/repos', async (req, res) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      const body = createRepoBodySchema.parse(req.body);
      const summary = await githubRepos.createRepository(body, logger);
      res.status(201).json(summary);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.message });
        return;
      }
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      if (status >= 500) {
        logger.error(message);
      }
      res.status(status).json({ error: message });
    }
  });

  router.get('/repos/:owner/:repo', async (req, res) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      const { owner, repo } = req.params;
      const snapshot = await githubRepos.getRepository(owner, repo);
      res.json(snapshot);
    } catch (err) {
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      if (status >= 500) {
        logger.error(message);
      }
      res.status(status).json({ error: message });
    }
  });

  router.patch('/repos/:owner/:repo', async (req, res) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      const { owner, repo } = req.params;
      const body = updateRepoBodySchema.parse(req.body);
      logger.warn(
        'manage-github-repo: direct PATCH bypasses approvals—restrict network access in production clusters.',
      );
      const svcSummary = await githubRepos.updateRepository(
        owner,
        repo,
        body.settings,
        logger,
      );
      res.json(svcSummary);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.message });
        return;
      }
      const status = httpStatusForError(err);
      const message = err instanceof Error ? err.message : String(err);
      if (status >= 500) {
        logger.error(message);
      }
      res.status(status).json({ error: message });
    }
  });

  return router;
}
