import {
  Alert,
  Box,
  Button,
  ButtonLink,
  Checkbox,
  Flex,
  TextField,
} from '@backstage/ui';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import type { GithubRepoSummary } from '../hooks/useGithubRepoManagement';
import type {
  BranchRulesetPresetOption,
  GithubRepoSettingsPayload,
  RepoSettingsUpdateSubmittedResponse,
  RepoSettingsUpdateSubmitResult,
} from '../types';

function togglePreset(
  current: Set<string>,
  id: string,
  enabled: boolean,
): Set<string> {
  const next = new Set(current);
  if (enabled) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

type SharedProps = {
  presetsError: string | null;
  loadingPresets: boolean;
  presets: BranchRulesetPresetOption[];
  loadRepo: (owner: string, repo: string) => Promise<GithubRepoSummary>;
  requestRepoSettingsUpdate: (
    owner: string,
    repo: string,
    settings: GithubRepoSettingsPayload,
  ) => Promise<RepoSettingsUpdateSubmitResult>;
  submittingSettingsApproval: boolean;
};

export type GithubRepoSettingsPresetAlerts = 'embedded' | 'none';

/** Standalone: editable owner/repo and manual load (GitHub repos admin page). */
export type GithubRepoSettingsStandaloneProps = SharedProps & {
  mode: 'standalone';
  /** Omit when the parent already shows preset loading/errors (main admin page). */
  presetAlertsPlacement?: GithubRepoSettingsPresetAlerts;
};

/** Catalog entity: fixed `{owner}/{repo}` from annotations; loads on mount. */
export type GithubRepoSettingsCatalogProps = SharedProps & {
  mode: 'catalog';
  catalogOwner: string;
  catalogRepo: string;
};

export type GithubRepoSettingsFormProps =
  | GithubRepoSettingsStandaloneProps
  | GithubRepoSettingsCatalogProps;

export function GithubRepoSettingsForm(props: GithubRepoSettingsFormProps) {
  const {
    presetsError,
    loadingPresets,
    presets,
    loadRepo,
    requestRepoSettingsUpdate,
    submittingSettingsApproval,
  } = props;

  const isCatalog = props.mode === 'catalog';
  const fixedOwner = isCatalog ? props.catalogOwner : undefined;
  const fixedRepoName = isCatalog ? props.catalogRepo : undefined;

  const [standaloneOwner, setStandaloneOwner] = useState('');
  const [standaloneRepo, setStandaloneRepo] = useState('');

  const owner = isCatalog ? fixedOwner! : standaloneOwner;
  const repoName = isCatalog ? fixedRepoName! : standaloneRepo;

  const [defaultBranch, setDefaultBranch] = useState('');
  const [deleteHead, setDeleteHead] = useState(false);
  const [presetSet, setPresetSet] = useState(() => new Set<string>());
  const [loadBusy, setLoadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GithubRepoSummary | null>(null);
  const [approvalSubmitted, setApprovalSubmitted] =
    useState<RepoSettingsUpdateSubmittedResponse | null>(null);

  const catalogSlugOwner = props.mode === 'catalog' ? props.catalogOwner : '';
  const catalogSlugRepo =
    props.mode === 'catalog' ? props.catalogRepo : '';

  const loadFromGithub = useCallback(
    async (o: string, r: string) => {
      setError(null);
      setLoadBusy(true);
      try {
        const summary = await loadRepo(o, r);
        setDefaultBranch(summary.defaultBranch);
        setDeleteHead(summary.deleteBranchOnMerge);
        setResult(summary);
        setApprovalSubmitted(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unexpected error');
      } finally {
        setLoadBusy(false);
      }
    },
    [loadRepo],
  );

  useEffect(() => {
    const o = catalogSlugOwner.trim();
    const r = catalogSlugRepo.trim();
    if (!o || !r) {
      return;
    }
    void loadFromGithub(o, r);
  }, [
    catalogSlugOwner,
    catalogSlugRepo,
    loadFromGithub,
  ]);

  const presetAlertsPlacement =
    props.mode === 'catalog'
      ? 'embedded'
      : (props.presetAlertsPlacement ?? 'none');

  const payloadSettings = useMemo(() => {
    const settings: GithubRepoSettingsPayload = {};
    const branch = defaultBranch.trim();
    if (branch.length > 0) {
      settings.defaultBranch = branch;
    }
    settings.deleteBranchOnMerge = deleteHead;
    if (presetSet.size > 0) {
      settings.branchRulesetPresetIds = [...presetSet];
    }
    return settings;
  }, [defaultBranch, deleteHead, presetSet]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setApprovalSubmitted(null);
    const o = owner.trim();
    const r = repoName.trim();
    if (!o || !r) {
      setError('Owner and repository name are required.');
      return;
    }
    try {
      const res = await requestRepoSettingsUpdate(o, r, payloadSettings);
      if (res.ok) {
        setApprovalSubmitted(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    }
  };

  const description = isCatalog
    ? 'Propose changes to default branch behavior and branch-ruleset presets. An approver must approve in Backstage before GitHub is updated.'
    : 'Propose repository settings changes (default branch, merge behavior, and branch rulesets). Load the repo first to pre-fill fields, then adjust and request an update. An approver must approve before GitHub is updated.';

  return (
    <>
      {presetAlertsPlacement === 'embedded' && presetsError ? (
        <Alert status="danger" title="Could not load ruleset presets">
          <Box>{presetsError}</Box>
        </Alert>
      ) : null}
      {presetAlertsPlacement === 'embedded' && loadingPresets ? (
        <Box>Loading branch ruleset presets…</Box>
      ) : null}
      <form onSubmit={handleSubmit} noValidate>
        <Flex direction="column" gap="4">
          <Box>{description}</Box>
          {approvalSubmitted ? (
            <Alert
              status="success"
              title="Approval request submitted"
              icon
            >
              <Flex direction="column" gap="2">
                <Box>
                  Your request is <strong>{approvalSubmitted.status}</strong>.
                  An approver will be notified. Track it under{' '}
                  <RouterLink to={`/approvals/${approvalSubmitted.id}`}>
                    approval {approvalSubmitted.id.slice(0, 8)}…
                  </RouterLink>
                  .
                </Box>
                <ButtonLink variant="secondary" href="/approvals/mine">
                  View my requests
                </ButtonLink>
              </Flex>
            </Alert>
          ) : null}
          {error ? (
            <Alert status="danger" title="Could not submit request">
              <Box>{error}</Box>
            </Alert>
          ) : null}
          {result && !error ? (
            <Alert status="info" title="Current state on GitHub">
              <Flex direction="column" gap="2">
                <Box>
                  <strong>{result.fullName}</strong>
                  {result.htmlUrl ? (
                    <>
                      {' '}
                      (
                      <a href={result.htmlUrl} target="_blank" rel="noreferrer">
                        GitHub
                      </a>
                      )
                    </>
                  ) : null}
                </Box>
              </Flex>
            </Alert>
          ) : null}
          {props.mode === 'catalog' ? (
            <Flex direction="row" gap="4" align="center">
              <Box>
                GitHub slug:{' '}
                <strong>
                  {props.catalogOwner}/{props.catalogRepo}
                </strong>
              </Box>
              <Button
                type="button"
                variant="secondary"
                onPress={() =>
                  loadFromGithub(
                    props.catalogOwner.trim(),
                    props.catalogRepo.trim(),
                  )
                }
                isDisabled={loadBusy || !props.catalogOwner || !props.catalogRepo}
                loading={loadBusy}
              >
                Refresh from GitHub
              </Button>
            </Flex>
          ) : null}
          {props.mode === 'standalone' ? (
            <Flex
              direction="row"
              gap="4"
              align="end"
              style={{ flexWrap: 'wrap' }}
            >
              <Box style={{ flex: '1 1 200px' }}>
                <TextField
                  label="Owner (org or user)"
                  name="updOwner"
                  value={standaloneOwner}
                  onChange={setStandaloneOwner}
                  placeholder="e.g. my-org"
                  isRequired
                />
              </Box>
              <Box style={{ flex: '1 1 200px' }}>
                <TextField
                  label="Repository name"
                  name="updRepo"
                  value={standaloneRepo}
                  onChange={setStandaloneRepo}
                  placeholder="e.g. my-service"
                  isRequired
                />
              </Box>
              <Button
                type="button"
                variant="secondary"
                onPress={() =>
                  loadFromGithub(
                    standaloneOwner.trim(),
                    standaloneRepo.trim(),
                  )
                }
                isDisabled={loadBusy}
                loading={loadBusy}
              >
                Load repository
              </Button>
            </Flex>
          ) : null}
          <TextField
            label="Default branch"
            name="updDefaultBranch"
            value={defaultBranch}
            onChange={setDefaultBranch}
          />
          <Checkbox isSelected={deleteHead} onChange={setDeleteHead}>
            Automatically delete head branches after merges
          </Checkbox>
          <Box>
            <Box style={{ marginBottom: 8 }}>
              Branch ruleset presets (create or update matching rulesets)
            </Box>
            <Flex direction="column" gap="2">
              {presets.map(p => (
                <Checkbox
                  key={p.id}
                  isSelected={presetSet.has(p.id)}
                  onChange={value =>
                    setPresetSet(prev =>
                      togglePreset(prev, p.id, value),
                    )
                  }
                >
                  <strong>{p.id}</strong> — {p.description}
                </Checkbox>
              ))}
            </Flex>
          </Box>
          <Box>
            <Button
              type="submit"
              variant="primary"
              isDisabled={submittingSettingsApproval}
              loading={submittingSettingsApproval}
            >
              Request settings update
            </Button>
          </Box>
        </Flex>
      </form>
    </>
  );
}
