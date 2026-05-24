import type { Octokit } from '@octokit/rest';
import type {
  GithubRepoSettings,
  RepoSettingsSnapshot,
  RepoSummary,
} from '@internal/backstage-plugin-manage-github-repo-common';

import { detectInstalledPresetIds } from './rulesetSync';
import { iteratePaginatedEndPoints } from './octokitPaginate';

type GithubCollaboratorPermissions =
  | 'pull'
  | 'triage'
  | 'push'
  | 'maintain'
  | 'admin';

async function readOptionalSafe<T>(
  fn: () => Promise<T>,
  fallback?: T,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error: unknown) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
        ? (error as { status: number }).status
        : undefined;
    if (
      status !== undefined &&
      (status === 403 || status === 404 || status === 451)
    ) {
      return fallback;
    }
    throw error;
  }
}

function normalizePermission(
  p: string | undefined,
): GithubCollaboratorPermissions {
  const v = (p ?? '').toLowerCase();
  if (
    v === 'pull' ||
    v === 'triage' ||
    v === 'push' ||
    v === 'maintain' ||
    v === 'admin'
  ) {
    return v;
  }
  return 'pull';
}

function flattenSummaryFields(summary: RepoSummary): Pick<
  RepoSettingsSnapshot,
  | 'owner'
  | 'name'
  | 'fullName'
  | 'defaultBranch'
  | 'deleteBranchOnMerge'
  | 'htmlUrl'
  | 'private'
> {
  return {
    owner: summary.owner,
    name: summary.name,
    fullName: summary.fullName,
    defaultBranch: summary.defaultBranch,
    deleteBranchOnMerge: summary.deleteBranchOnMerge,
    htmlUrl: summary.htmlUrl,
    private: summary.private,
  };
}

/** Load GitHub-backed settings for Repo Settings UI + approvals baselines. */
export async function buildRepoSettingsSnapshot(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<RepoSettingsSnapshot> {
  const { data } = await octokit.rest.repos.get({ owner, repo });

  const summary: RepoSummary = {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name ?? `${data.owner.login}/${data.name}`,
    defaultBranch: data.default_branch ?? '',
    deleteBranchOnMerge: Boolean(data.delete_branch_on_merge),
    htmlUrl: data.html_url ?? '',
    private: Boolean(data.private),
  };

  const settings: GithubRepoSettings = {};

  settings.description = data.description ?? undefined;
  settings.homepage = data.homepage ?? undefined;

  if (typeof (data as { visibility?: unknown }).visibility === 'string') {
    const v = (data as { visibility: string }).visibility;
    if (v === 'public' || v === 'private' || v === 'internal') {
      settings.visibility = v;
    }
  }

  settings.isTemplate = Boolean((data as { is_template?: boolean }).is_template);
  settings.archived = Boolean(data.archived);
  if (summary.defaultBranch) {
    settings.defaultBranch = summary.defaultBranch;
  }
  settings.deleteBranchOnMerge = summary.deleteBranchOnMerge;
  settings.allowMergeCommit = data.allow_merge_commit ?? undefined;
  settings.allowSquashMerge = data.allow_squash_merge ?? undefined;
  settings.allowRebaseMerge = data.allow_rebase_merge ?? undefined;
  settings.allowAutoMerge = data.allow_auto_merge ?? undefined;
  settings.allowUpdateBranch = data.allow_update_branch ?? undefined;
  settings.squashMergeCommitTitle = data.squash_merge_commit_title ?? undefined;
  settings.squashMergeCommitMessage =
    data.squash_merge_commit_message ?? undefined;
  settings.mergeCommitTitle = data.merge_commit_title ?? undefined;
  settings.mergeCommitMessage = data.merge_commit_message ?? undefined;
  settings.webCommitSignoffRequired =
    data.web_commit_signoff_required ?? undefined;
  settings.hasIssues = data.has_issues ?? undefined;
  settings.hasProjects = data.has_projects ?? undefined;
  settings.hasWiki = data.has_wiki ?? undefined;
  settings.hasDiscussions = data.has_discussions ?? undefined;

  const analysis = (
    data as {
      security_and_analysis?: {
        secret_scanning?: { status?: string };
        secret_scanning_push_protection?: { status?: string };
      };
    }
  ).security_and_analysis;
  const ss = analysis?.secret_scanning?.status;
  const sspp = analysis?.secret_scanning_push_protection?.status;

  function pickToggle(
    raw: string | undefined,
  ): 'enabled' | 'disabled' | undefined {
    if (raw === 'enabled' || raw === 'disabled') {
      return raw;
    }
    return undefined;
  }
  const ssToggled = pickToggle(ss);
  if (ssToggled) {
    settings.secretScanning = ssToggled;
  }
  const ssppToggled = pickToggle(sspp);
  if (ssppToggled) {
    settings.secretScanningPushProtection = ssppToggled;
  }

  await readOptionalSafe(async () => {
    try {
      await octokit.rest.repos.checkVulnerabilityAlerts({
        owner,
        repo,
      });
      settings.vulnerabilityAlerts = true;
      return undefined;
    } catch (alertErr: unknown) {
      const st =
        typeof alertErr === 'object' &&
        alertErr !== null &&
        'status' in alertErr &&
        typeof (alertErr as { status: unknown }).status === 'number'
          ? (alertErr as { status: number }).status
          : undefined;
      if (st === 404) {
        settings.vulnerabilityAlerts = false;
        return undefined;
      }
      throw alertErr;
    }
  });

  await readOptionalSafe(async () => {
    const res = await octokit.rest.repos.checkAutomatedSecurityFixes({
      owner,
      repo,
    });
    settings.dependabotSecurityUpdates = Boolean(
      (res.data as { enabled?: boolean }).enabled,
    );
    return undefined;
  });

  await readOptionalSafe(async () => {
    const ghPerm =
      await octokit.rest.actions.getGithubActionsPermissionsRepository({
        owner,
        repo,
      });
    const pdata = ghPerm.data as Record<string, unknown>;
    settings.actionsEnabled = {
      enabled: pdata.enabled === true || pdata.enabled === 'all',
      ...(typeof pdata.allowed_actions === 'string'
        ? {
            allowed_actions: pdata.allowed_actions as
              | 'all'
              | 'selected'
              | 'local_only',
          }
        : {}),
      ...(typeof pdata.selected_actions_url === 'string' ||
      pdata.selected_actions_url === null
        ? {
            selected_actions_url: pdata.selected_actions_url as string | null,
          }
        : {}),
    };
    return undefined;
  });

  await readOptionalSafe(async () => {
    const wf =
      await octokit.rest.actions.getGithubActionsDefaultWorkflowPermissionsRepository(
        {
          owner,
          repo,
        },
      );
    settings.defaultWorkflowPermissions = {
      default_workflow_permissions:
        wf.data.default_workflow_permissions === 'write' ? 'write' : 'read',
      can_approve_pull_request_reviews:
        wf.data.can_approve_pull_request_reviews ?? undefined,
    };
    return undefined;
  });

  await readOptionalSafe(async () => {
    const tops = await octokit.rest.repos.getAllTopics({
      owner,
      repo,
    });
    settings.topics = [...(tops.data.names ?? [])];
    return undefined;
  });

  await readOptionalSafe(async () => {
    const hookRows =
      await iteratePaginatedEndPoints<Record<string, unknown>>(
        octokit,
        octokit.rest.repos.listWebhooks as never,
        { owner, repo, per_page: 100 },
      );

    settings.webhooks = hookRows.map(w => {
      const cfg = (
        typeof w.config === 'object' && w.config !== null
          ? w.config
          : {}
      ) as { url?: string; content_type?: string };

      const ev = Array.isArray(w.events) ? (w.events as string[]) : [];

      return {
        id: Number(w.id),
        url: cfg.url ?? '',
        events: ev,
        active: Boolean(w.active ?? true),
        contentType:
          cfg.content_type === 'form'
            ? ('form' as const)
            : ('json' as const),
      };
    });
    return undefined;
  });

  await readOptionalSafe(async () => {
    const dk = await iteratePaginatedEndPoints<Record<string, unknown>>(
      octokit,
      octokit.rest.repos.listDeployKeys as never,
      {
        owner,
        repo,
        per_page: 100,
      },
    );
    settings.deployKeys = dk.map(k => ({
      id: typeof k.id === 'number' ? k.id : undefined,
      title: String(k.title ?? 'deploy-key'),
      read_only:
        typeof k.read_only === 'boolean' ? k.read_only : undefined,
    }));
    return undefined;
  });

  await readOptionalSafe(async () => {
    const envRes = await octokit.rest.repos.getAllEnvironments({
      owner,
      repo,
    });
    settings.environments =
      envRes.data.environments?.map(e => ({
        name: e.name ?? '',
      })) ?? [];
    return undefined;
  });

  await readOptionalSafe(async () => {
    const collaborators =
      await iteratePaginatedEndPoints<Record<string, unknown>>(
        octokit,
        octokit.rest.repos.listCollaborators as never,
        { owner, repo, affiliation: 'direct', per_page: 100 },
      );

    settings.collaborators =
      collaborators
        .filter(c => !!c.login)
        .map(c => ({
          username: String(c.login),
          permission: normalizePermission(String(c.role_name)),
        }))
        .sort((a, b) => a.username.localeCompare(b.username)) ?? [];
    return undefined;
  });

  await readOptionalSafe(async () => {
    const teams = await iteratePaginatedEndPoints<Record<string, unknown>>(
      octokit,
      octokit.rest.repos.listTeams as never,
      {
        owner,
        repo,
        per_page: 100,
      },
    );

    settings.teamAccess =
      teams
        .filter(t => !!t.slug)
        .map(t => {
          const slug = String(t.slug);
          let perm: GithubCollaboratorPermissions = 'pull';

          const permsObj =
            typeof t.permissions === 'object' &&
            t.permissions !== null
              ? (t.permissions as Record<string, boolean>)
              : {};

          if (permsObj.admin) perm = 'admin';
          else if (permsObj.maintain) perm = 'maintain';
          else if (permsObj.push) perm = 'push';
          else if (permsObj.triage) perm = 'triage';
          else perm = normalizePermission(String(t.role_name));

          return { teamSlug: slug, permission: perm };
        })
        .sort((a, b) => a.teamSlug.localeCompare(b.teamSlug)) ?? [];
    return undefined;
  });

  const actionSecretNames =
    (await readOptionalSafe(async (): Promise<string[]> => {
      const names: string[] = [];
      for await (const res of octokit.paginate.iterator(
        octokit.rest.actions.listRepoSecrets as never,
        {
          owner,
          repo,
          per_page: 100,
        } as never,
      )) {
        const batch =
          (
            res as unknown as {
              data: {
                secrets?: { name?: string }[];
              };
            }
          ).data?.secrets ?? [];
        for (const row of batch) {
          if (row.name) {
            names.push(row.name);
          }
        }
      }
      names.sort((a, b) => a.localeCompare(b));
      return names;
    })) ?? [];

  const depSecretNames =
    (await readOptionalSafe(async () => {
      const s = await octokit.rest.dependabot.listRepoSecrets({
        owner,
        repo,
        per_page: 100,
      });
      const raw = ((s.data as unknown) as { secrets?: { name?: string }[] })
        ?.secrets;
      const names =
        raw
          ?.map(x => String(x.name ?? ''))
          ?.filter(Boolean)
          ?.sort((a, b) => a.localeCompare(b)) ?? [];
      return names;
    })) ?? [];

  await readOptionalSafe(async () => {
    try {
      const pages = await octokit.rest.repos.getPagesSite({ owner, repo });
      const p = pages.data as {
        build_type?: 'legacy' | 'workflow';
        source?: {
          branch?: string;
          path?: string | null;
        };
      };

      settings.pages = {
        build_type: p.build_type,
        legacyBranch: p.source?.branch ?? undefined,
        legacyPath:
          typeof p.source?.path === 'string' ? p.source.path || '/' : undefined,
      };
    } catch (e: unknown) {
      const st =
        typeof e === 'object' &&
        e !== null &&
        'status' in e &&
        typeof (e as { status: unknown }).status === 'number'
          ? (e as { status: number }).status
          : undefined;
      if (st !== undefined && st !== 404 && st !== 451) {
        throw e;
      }
    }
    return undefined;
  });

  const rulesResp = await readOptionalSafe(() =>
    octokit.rest.repos.getRepoRulesets({
      owner,
      repo,
    }),
  );
  const rulesetsList = rulesResp?.data ?? [];
  const managedRulesetPresetIds = detectInstalledPresetIds(
    rulesetsList.filter(r => !!r?.name).map(r => String(r.name)),
  );
  settings.branchRulesetPresetIds =
    managedRulesetPresetIds.length > 0
      ? [...managedRulesetPresetIds]
      : undefined;

  const secretNamesActionsPart =
    actionSecretNames.length > 0 ? actionSecretNames : undefined;
  const secretNamesDependabotPart =
    depSecretNames.length > 0 ? depSecretNames : undefined;

  return {
    ...flattenSummaryFields(summary),
    summary,
    settings,
    managedRulesetPresetIds,
    ...(secretNamesActionsPart ? { secretNamesActions: secretNamesActionsPart } : {}),
    ...(secretNamesDependabotPart
      ? { secretNamesDependabot: secretNamesDependabotPart }
      : {}),
  };
}
