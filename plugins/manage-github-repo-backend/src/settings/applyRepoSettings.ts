import { InputError } from '@backstage/errors';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Octokit } from '@octokit/rest';
import type { GithubRepoSettings } from '@internal/backstage-plugin-manage-github-repo-common';

import { encryptSecretForGithub } from './encryptGithubSecret';
import { iteratePaginatedEndPoints } from './octokitPaginate';
import { syncRepositoryRulesets } from './rulesetSync';

type CollaboratorPermission = NonNullable<
  GithubRepoSettings['collaborators']
>[number]['permission'];

/**
 * Applies whichever keys are populated on `{ ...GithubRepoSettings }`. Approvals payloads are
 * typically sparse lists / scalars rather than exhaustive POST bodies.
 */
export async function applyGithubRepoSettings(
  octokit: Octokit,
  owner: string,
  repo: string,
  settings: GithubRepoSettings,
  logger: LoggerService,
): Promise<void> {
  const { data: baseline } = await octokit.rest.repos.get({
    owner,
    repo,
  });

  const reposPatch = {
    owner,
    repo,
  } as Parameters<typeof octokit.rest.repos.update>[0];

  const assign = <
    PayloadKey extends keyof GithubRepoSettings,
    Api extends keyof Parameters<typeof octokit.rest.repos.update>[0],
  >(id: PayloadKey, apiField: Api) => {
    const value = settings[id];
    if (value !== undefined) {
      (reposPatch as Record<string, unknown>)[apiField as string] =
        value as unknown;
      return true;
    }
    return false;
  };

  let mutated = false;
  mutated ||= assign('description', 'description');
  mutated ||= assign('homepage', 'homepage');
  mutated ||= assign('visibility', 'visibility');
  mutated ||= assign('hasIssues', 'has_issues');
  mutated ||= assign('hasProjects', 'has_projects');
  mutated ||= assign('hasWiki', 'has_wiki');
  mutated ||= assign('hasDiscussions', 'has_discussions');
  mutated ||= assign('allowMergeCommit', 'allow_merge_commit');
  mutated ||= assign('allowSquashMerge', 'allow_squash_merge');
  mutated ||= assign('allowRebaseMerge', 'allow_rebase_merge');
  mutated ||= assign('allowAutoMerge', 'allow_auto_merge');
  mutated ||= assign('allowUpdateBranch', 'allow_update_branch');
  mutated ||= assign('squashMergeCommitTitle', 'squash_merge_commit_title');
  mutated ||= assign('squashMergeCommitMessage', 'squash_merge_commit_message');
  mutated ||= assign('mergeCommitTitle', 'merge_commit_title');
  mutated ||= assign('mergeCommitMessage', 'merge_commit_message');
  mutated ||= assign('deleteBranchOnMerge', 'delete_branch_on_merge');
  mutated ||= assign('archived', 'archived');
  mutated ||= assign('webCommitSignoffRequired', 'web_commit_signoff_required');
  mutated ||= assign('defaultBranch', 'default_branch');
  mutated ||= assign('isTemplate', 'is_template');

  if (
    settings.secretScanning !== undefined ||
    settings.secretScanningPushProtection !== undefined
  ) {
    const nextSa: Record<string, unknown> =
      baseline.security_and_analysis &&
      typeof baseline.security_and_analysis === 'object'
        ? JSON.parse(JSON.stringify(baseline.security_and_analysis))
        : {};

    if (settings.secretScanning !== undefined) {
      nextSa.secret_scanning = { status: settings.secretScanning };
    }
    if (settings.secretScanningPushProtection !== undefined) {
      nextSa.secret_scanning_push_protection = {
        status: settings.secretScanningPushProtection,
      };
    }
    reposPatch.security_and_analysis =
      nextSa as typeof baseline.security_and_analysis;
    mutated = true;
  }

  if (mutated) {
    logger.info(`repos.update (${owner}/${repo})`);
    await octokit.rest.repos.update(reposPatch);
  }

  if (settings.topics !== undefined) {
    await octokit.rest.repos.replaceAllTopics({
      owner,
      repo,
      names: [...settings.topics],
    });
  }

  if (settings.vulnerabilityAlerts !== undefined) {
    if (settings.vulnerabilityAlerts) {
      await octokit.rest.repos.enableVulnerabilityAlerts({
        owner,
        repo,
      });
    } else {
      await octokit.rest.repos.disableVulnerabilityAlerts({
        owner,
        repo,
      });
    }
  }

  if (settings.dependabotSecurityUpdates !== undefined) {
    if (settings.dependabotSecurityUpdates) {
      await octokit.rest.repos.enableAutomatedSecurityFixes({
        owner,
        repo,
      });
    } else {
      await octokit.rest.repos.disableAutomatedSecurityFixes({
        owner,
        repo,
      });
    }
  }

  if (settings.actionsEnabled !== undefined) {
    await octokit.rest.actions.setGithubActionsPermissionsRepository({
      owner,
      repo,
      enabled: Boolean(settings.actionsEnabled.enabled),
      allowed_actions: settings.actionsEnabled.allowed_actions,
    } as never);
  }

  if (settings.defaultWorkflowPermissions !== undefined) {
    await octokit.rest.actions.setGithubActionsDefaultWorkflowPermissionsRepository(
      {
        owner,
        repo,
        ...settings.defaultWorkflowPermissions,
      } as never,
    );
  }

  if (settings.pages !== undefined) {
    const p = settings.pages;
    const buildType =
      p.build_type ?? (p.legacyBranch ? 'legacy' : 'workflow');
    const source =
      buildType === 'workflow'
        ? undefined
        : {
            branch: p.legacyBranch ?? 'main',
            path: p.legacyPath ?? '/',
          };

    try {
      await octokit.rest.repos.createPagesSite({
        owner,
        repo,
        build_type: buildType === 'workflow' ? 'workflow' : 'legacy',
        source,
      } as never);
    } catch (err) {
      logger.warn(
        `manage-github-repo: skipping Pages (${owner}/${repo}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (settings.branchRulesetPresetIds !== undefined) {
    const presetBranch =
      settings.defaultBranch ?? baseline.default_branch ?? 'main';

    await syncRepositoryRulesets(
      octokit,
      owner,
      repo,
      presetBranch,
      settings.branchRulesetPresetIds ?? [],
      logger,
    );
  }

  if (settings.webhooks !== undefined) {
    const existingHooks = await iteratePaginatedEndPoints<{
      id?: number | null;
    }>(octokit, octokit.rest.repos.listWebhooks as never, {
      owner,
      repo,
      per_page: 80,
    });
    const keepIds = new Set(
      settings.webhooks.map(h => h.id).filter(Boolean) as number[],
    );

    for (const hookRow of existingHooks) {
      const hookId =
        typeof hookRow?.id === 'number'
          ? hookRow.id
          : Number.NaN;
      if (!Number.isFinite(hookId)) {
        continue;
      }
      if (keepIds.has(hookId)) {
        continue;
      }
      await octokit.rest.repos.deleteWebhook({
        owner,
        repo,
        hook_id: hookId,
      });
    }

    for (const hookCfg of settings.webhooks) {
      const bodyCore = {
        active: hookCfg.active ?? true,
        events: [...hookCfg.events],
        config: {
          url: hookCfg.url,
          insecure_ssl: '0',
          content_type:
            hookCfg.contentType === 'form' ? ('form' as const) : ('json' as const),
          ...(typeof hookCfg.secret === 'string'
            ? { secret: hookCfg.secret }
            : {}),
        },
      };

      if (hookCfg.id !== undefined && Number.isFinite(hookCfg.id)) {
        await octokit.rest.repos.updateWebhook({
          owner,
          repo,
          hook_id: hookCfg.id,
          ...bodyCore,
        } as never);
      } else {
        await octokit.rest.repos.createWebhook({
          owner,
          repo,
          ...bodyCore,
        } as never);
      }
    }
  }

  if (settings.deployKeys !== undefined) {
    const existingDeployKeys =
      await iteratePaginatedEndPoints<{ id?: number | null }>(
        octokit,
        octokit.rest.repos.listDeployKeys as never,
        {
          owner,
          repo,
          per_page: 80,
        },
      );
    const keepIds = new Set(
      settings.deployKeys.map(d => d.id).filter(Boolean) as number[],
    );

    for (const row of existingDeployKeys) {
      const idNum =
        typeof row?.id === 'number'
          ? row.id
          : Number.NaN;
      if (!Number.isFinite(idNum) || keepIds.has(idNum)) {
        continue;
      }
      await octokit.rest.repos.deleteDeployKey({
        owner,
        repo,
        deploy_key_id: idNum,
      });
    }

    for (const desired of settings.deployKeys) {
      const keymaterial = typeof desired.key === 'string' ? desired.key.trim() : '';
      if (!keymaterial.length && desired.id !== undefined) {
        continue;
      }
      if (!keymaterial.length) {
        continue;
      }
      if (
        typeof desired.id === 'number' &&
        existingDeployKeys.some(
          dk => dk.id !== undefined && dk.id === desired.id,
        )
      ) {
        await octokit.rest.repos.deleteDeployKey({
          owner,
          repo,
          deploy_key_id: desired.id,
        });
      }
      await octokit.rest.repos.createDeployKey({
        owner,
        repo,
        title: desired.title,
        key: keymaterial,
        read_only: Boolean(desired.read_only),
      });
    }
  }

  if (settings.environments !== undefined) {
    const current = (
      await octokit.rest.repos.getAllEnvironments({
        owner,
        repo,
      })
    ).data.environments?.map(env => `${env?.name ?? ''}`) ??
      ([] as string[]);
    const nextSet = new Set(
      settings.environments
        ?.map(env => `${env?.name ?? ''}`.trim())
        .filter(Boolean) ?? [],
    );

    for (const name of current) {
      if (!name.trim().length || nextSet.has(name)) {
        continue;
      }
      await octokit.rest.repos.deleteAnEnvironment({
        owner,
        repo,
        environment_name: name,
      });
    }

    for (const cfg of settings.environments ?? []) {
      await octokit.rest.repos.createOrUpdateEnvironment({
        owner,
        repo,
        environment_name: `${cfg?.name ?? ''}`.trim(),
        ...(cfg?.deployment_branch_policy
          ? { deployment_branch_policy: cfg.deployment_branch_policy }
          : {}),
        ...(cfg?.deployment_branch_policies
          ? { deployment_branch_policies: cfg.deployment_branch_policies }
          : {}),
      } as never);
    }
  }

  if (settings.collaborators !== undefined) {
    const collaboratorRows =
      await iteratePaginatedEndPoints<{ login?: string | null }>(
        octokit,
        octokit.rest.repos.listCollaborators as never,
        {
          owner,
          repo,
          affiliation: 'direct',
          per_page: 100,
        },
      );

    const currentByLc = new Map(
      collaboratorRows
        .filter(row => !!row.login)
        .map(row => [
          String(row.login!).toLowerCase(),
          `${row!.login}`,
        ]),
    );

    const desiredByLc = new Map<
      string,
      { loginInput: string; permission: CollaboratorPermission }
    >();

    settings.collaborators.forEach(collab =>
      desiredByLc.set(collab.username.toLowerCase().trim(), {
        loginInput: collab.username.trim(),
        permission: collab.permission as CollaboratorPermission,
      }),
    );

    for (const [lc, canonicalLogin] of currentByLc.entries()) {
      if (!desiredByLc.has(lc)) {
        await octokit.rest.repos.removeCollaborator({
          owner,
          repo,
          username: canonicalLogin,
        });
      }
    }

    for (const [, entry] of desiredByLc.entries()) {
      await octokit.rest.repos.addCollaborator({
        owner,
        repo,
        username: entry.loginInput,
        permission: entry.permission as never,
      });
    }
  }

  if (settings.teamAccess !== undefined) {
    if (baseline.owner.type !== 'Organization') {
      throw new InputError(
        'Managing teams requires repositories owned by a GitHub organisation.',
      );
    }
    const org = owner;

    const teamSnap = await iteratePaginatedEndPoints<{
      slug?: string | null;
    }>(
      octokit,
      octokit.rest.repos.listTeams as never,
      { owner, repo, per_page: 80 },
    );

    const currentSlugByLc = new Map(
      teamSnap
        .filter(t => !!t.slug)
        .map(team => [`${team.slug}`.toLowerCase(), `${team.slug}`]),
    );

    const desiredTeams = settings.teamAccess!.map(te => ({
      lc: `${te.teamSlug}`.toLowerCase().trim(),
      slug: `${te.teamSlug}`.trim(),
      permission:
        `${te.permission}` as GithubRepoSettings['teamAccess'][number]['permission'],
    }));

    const desiredLc = new Set(desiredTeams.map(d => d.lc));

    for (const [lc, canonicalSlug] of currentSlugByLc.entries()) {
      if (!desiredLc.has(lc)) {
        logger.info(`Removing repo team ${canonicalSlug}`);
        await octokit.rest.teams.removeRepoInOrg({
          org,
          team_slug: canonicalSlug,
          owner,
          repo,
        });
      }
    }

    for (const team of desiredTeams) {
      await octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
        org,
        team_slug: team.slug,
        owner,
        repo,
        permission: team.permission as never,
      });
    }
  }

  if (settings.actionsSecrets !== undefined) {
    const { data } =
      await octokit.rest.actions.getRepoPublicKey({ owner, repo });
    for (const row of settings.actionsSecrets) {
      const encrypted_value = await encryptSecretForGithub(row.plaintext, data.key);
      await octokit.rest.actions.createOrUpdateRepoSecret({
        owner,
        repo,
        secret_name: row.name,
        encrypted_value,
        key_id: data.key_id,
      });
    }
  }

  if (settings.dependabotSecrets !== undefined) {
    const { data } =
      await octokit.rest.dependabot.getRepoPublicKey({ owner, repo });
    for (const row of settings.dependabotSecrets) {
      const encrypted_value = await encryptSecretForGithub(row.plaintext, data.key);
      await octokit.rest.dependabot.createOrUpdateRepoSecret({
        owner,
        repo,
        secret_name: row.name,
        encrypted_value,
        key_id: data.key_id,
      });
    }
  }
}
