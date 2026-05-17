import {
  Alert,
  Box,
  Button,
  Checkbox,
  Flex,
  TextField,
} from '@backstage/ui';
import { toastApiRef, useApi } from '@backstage/frontend-plugin-api';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { GithubRepoSummary } from '../hooks/useGithubRepoManagement';
import type {
  BranchRulesetPresetOption,
  GithubRepoSettingsPayload,
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
  updateRepo: (
    owner: string,
    repo: string,
    settings: GithubRepoSettingsPayload,
  ) => Promise<GithubRepoSummary>;
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
  const toastApi = useApi(toastApiRef);
  const {
    presetsError,
    loadingPresets,
    presets,
    loadRepo,
    updateRepo,
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
  const [busy, setBusy] = useState(false);
  const [loadBusy, setLoadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GithubRepoSummary | null>(null);

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
    const o = owner.trim();
    const r = repoName.trim();
    if (!o || !r) {
      setError('Owner and repository name are required.');
      return;
    }
    setBusy(true);
    try {
      const summary = await updateRepo(o, r, payloadSettings);
      setResult(summary);
      toastApi.post({
        title: 'Repository settings saved',
        description: `Updates were applied to ${summary.fullName} on GitHub.`,
        status: 'success',
        timeout: 6000,
        ...(summary.htmlUrl
          ? {
              links: [
                { label: 'Open on GitHub', href: summary.htmlUrl },
              ],
            }
          : {}),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  const description = isCatalog
    ? 'Edit default branch behavior and branch-ruleset presets for this catalog entity linked repository.'
    : 'Update repository settings (default branch, merge behavior, and branch rulesets). Load the repo first to pre-fill fields, then adjust and save.';

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
          {error ? (
            <Alert status="danger" title="Update failed">
              <Box>{error}</Box>
            </Alert>
          ) : null}
          {result && !error ? (
            <Alert status="info" title="Loaded / saved state">
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
              isDisabled={busy}
              loading={busy}
            >
              Save settings
            </Button>
          </Box>
        </Flex>
      </form>
    </>
  );
}
