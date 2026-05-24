import {
  Alert,
  Box,
  Button,
  ButtonLink,
  Checkbox,
  Flex,
  TextField,
} from '@backstage/ui';
import {
  getRepoSettingUiDefinitions,
  githubRepoSettingsSchema,
} from '@internal/backstage-plugin-manage-github-repo-common';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { cloneSettings, diffGithubRepoSettings } from '../lib/diffGithubRepoSettings';
import type {
  BranchRulesetPresetOption,
  GithubRepoSettingsPayload,
  RepoSettingUiDefinition,
  RepoSettingsSnapshot,
  RepoSettingsUpdateSubmittedResponse,
  RepoSettingsUpdateSubmitResult,
} from '../types';

/** Catalog entity: repo slug annotated; standalone: editable slug + explicit load button. */

type SharedSubmitProps = {
  presetsError: string | null;
  loadingPresets: boolean;
  presets: BranchRulesetPresetOption[];
  loadRepo: (owner: string, repo: string) => Promise<RepoSettingsSnapshot>;
  requestRepoSettingsUpdate: (
    owner: string,
    repo: string,
    bundle: GithubRepoSettingsPayload,
    changedKeys: string[],
  ) => Promise<RepoSettingsUpdateSubmitResult>;
  submittingSettingsApproval: boolean;
};

export type GithubRepoSettingsStandaloneProps = SharedSubmitProps & {
  mode: 'standalone';
  presetAlertsPlacement?: 'embedded' | 'none';
};

export type GithubRepoSettingsCatalogProps = SharedSubmitProps & {
  mode: 'catalog';
  catalogOwner: string;
  catalogRepo: string;
};

export type GithubRepoSettingsFormProps =
  | GithubRepoSettingsStandaloneProps
  | GithubRepoSettingsCatalogProps;

function mergeBaselineFromSnapshot(snapshot: RepoSettingsSnapshot) {
  const merged: Record<string, unknown> = {
    ...(snapshot.settings as Record<string, unknown>),
  };
  merged.branchRulesetPresetIds = [...snapshot.managedRulesetPresetIds];
  return merged;
}

const CATEGORY_SORT = [
  'general',
  'merge',
  'features',
  'topics',
  'rulesets',
  'security',
  'actions',
  'pages',
  'webhooks',
  'access',
  'deployKeys',
  'environments',
  'secrets',
] as const;

function categorize(defs: RepoSettingUiDefinition[]) {
  const map = new Map<string, RepoSettingUiDefinition[]>();
  defs.forEach(def => {
    const list = map.get(def.category) ?? [];
    list.push(def);
    map.set(def.category, list);
  });

  for (const list of map.values()) {
    list.sort((alpha, beta) => alpha.label.localeCompare(beta.label));
  }
  return map;
}

type FieldProps = {
  def: RepoSettingUiDefinition;
  value: unknown;
  onChange: (next: unknown) => void;
};

function RepoSettingDynamicField(props: FieldProps) {
  const { def, value, onChange } = props;

  if (def.id === 'branchRulesetPresetIds') {
    return null;
  }

  switch (def.ui.control) {
    case 'boolean':
      return (
        <Checkbox
          isSelected={Boolean(value)}
          onChange={nextVal => {
            onChange(nextVal);
          }}
        >
          <Flex direction="column" gap="1">
            <Box>
              <strong>{def.label}</strong>
            </Box>
            <Box style={{ fontSize: '0.92rem' }}>
              {def.description}{' '}
              <SensHint sensitivity={def.sensitivity} />
            </Box>
          </Flex>
        </Checkbox>
      );
    case 'textarea':
      return (
        <Box style={{ flex: '1 1 380px', minWidth: 280 }}>
          <TextField
            label={String(def.label)}
            value={typeof value === 'string' ? value : `${value ?? ''}`}
            onChange={txt => {
              onChange(txt);
            }}
          />
          <Box style={{ fontSize: '0.92rem', marginTop: '4px' }}>
            {def.description}{' '}
            <SensHint sensitivity={def.sensitivity} />
          </Box>
        </Box>
      );
    case 'select':
      return (
        <Box style={{ minWidth: 280 }}>
          <Box style={{ marginBottom: 8, fontWeight: 600 }}>{def.label}</Box>
          <Box style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            {def.description}{' '}
            <SensHint sensitivity={def.sensitivity} />
          </Box>
          <select
            value={typeof value === 'string' ? value : `${value ?? ''}`}
            onChange={event => {
              onChange(event.target.value || undefined);
            }}
            aria-label={`${def.label} select`}
            style={{
              padding: '6px',
              marginBottom: '4px',
              minWidth: 220,
            }}
          >
            <option key="__placeholder" value="">
              — unchanged —
            </option>
            {def.ui.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Box>
      );
    default: {
      const jsonValue =
        typeof value === 'string'
          ? value
          : value === undefined
            ? ''
            : JSON.stringify(value, undefined, 2);
      return (
        <Box style={{ flex: '1 1 480px', minWidth: 320 }}>
          <Box style={{ marginBottom: 8, fontWeight: 600 }}>{def.label}</Box>
          <Box style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            {def.description}
            <SensHint sensitivity={def.sensitivity} />
          </Box>
          <textarea
            rows={Math.min(22, Math.max(6, jsonValue.split('\n').length))}
            value={jsonValue}
            onChange={evt => {
              const trimmed = evt.target.value.trim();
              if (!trimmed.length) {
                onChange(undefined);
                return;
              }
              try {
                onChange(JSON.parse(trimmed));
              } catch {
                onChange(evt.target.value); /* keep textual until blur parse success */
              }
            }}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              padding: '8px',
            }}
          />
        </Box>
      );
    }
  }
}

function SensHint(props: {
  sensitivity: RepoSettingUiDefinition['sensitivity'];
}) {
  if (props.sensitivity === 'high') {
    return <span style={{ color: '#bf360c', fontWeight: 600 }}>[high-risk]</span>;
  }
  if (props.sensitivity === 'medium') {
    return <span style={{ opacity: 0.75 }}>[medium-risk]</span>;
  }
  return null;
}

export function GithubRepoSettingsForm(props: GithubRepoSettingsFormProps) {
  const {
    presetsError,
    loadingPresets,
    presets,
    loadRepo,
    requestRepoSettingsUpdate,
    submittingSettingsApproval,
  } = props;

  const defs = useMemo(() => getRepoSettingUiDefinitions(), []);
  const categories = useMemo(() => categorize(defs), [defs]);

  const isCatalog = props.mode === 'catalog';
  const fixedOwner = isCatalog ? props.catalogOwner : '';
  const fixedRepo = isCatalog ? props.catalogRepo : '';

  const [standaloneOwner, setStandaloneOwner] = useState('');
  const [standaloneRepo, setStandaloneRepo] = useState('');

  const owner = isCatalog ? fixedOwner : standaloneOwner.trim();
  const repoName = isCatalog ? fixedRepo : standaloneRepo.trim();

  const [snapshot, setSnapshot] = useState<RepoSettingsSnapshot | null>(null);
  const [baseline, setBaseline] = useState<Record<string, unknown>>({});
  const [edited, setEdited] = useState<Record<string, unknown>>({});
  const [loadBusy, setLoadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalSubmitted, setApprovalSubmitted] =
    useState<RepoSettingsUpdateSubmittedResponse | null>(null);

  const presetAlertsPlacement =
    props.mode === 'catalog'
      ? 'embedded'
      : (props.presetAlertsPlacement ?? 'none');

  const hydrateFromSnapshot = useCallback((next: RepoSettingsSnapshot) => {
    const baselineMerged = mergeBaselineFromSnapshot(next);
    setBaseline(baselineMerged);
    setEdited(cloneSettings(baselineMerged));
    setApprovalSubmitted(null);
  }, []);

  const loadFromGithub = useCallback(
    async (o: string, r: string) => {
      const ownerTrimmed = o.trim();
      const repoTrimmed = r.trim();
      if (!ownerTrimmed || !repoTrimmed) {
        setSnapshot(null);
        setError('Owner and repo are required.');
        return;
      }
      setSnapshot(null);
      setError(null);
      setLoadBusy(true);
      try {
        const next = await loadRepo(ownerTrimmed, repoTrimmed);
        setSnapshot(next);
        hydrateFromSnapshot(next);
      } catch (event) {
        setError(event instanceof Error ? event.message : 'Unexpected error');
      } finally {
        setLoadBusy(false);
      }
    },
    [hydrateFromSnapshot, loadRepo],
  );

  useEffect(() => {
    if (props.mode !== 'catalog') {
      return;
    }
    const trimmedOwner = props.catalogOwner.trim();
    const trimmedRepo = props.catalogRepo.trim();
    if (!trimmedOwner || !trimmedRepo) {
      return;
    }
    void loadFromGithub(trimmedOwner, trimmedRepo);
  }, [loadFromGithub, props.mode, props.catalogOwner, props.catalogRepo]);

  function updateField(settingId: string, nextVal: unknown) {
    setEdited(prev => ({
      ...prev,
      [settingId]: nextVal,
    }));
  }

  async function submitHandler(event: FormEvent) {
    event.preventDefault();
    setApprovalSubmitted(null);
    setError(null);

    const o = owner.trim();
    const r = repoName.trim();
    if (!o || !r) {
      setError('Owner and repository name are required.');
      return;
    }

    try {
      const { partial, changedKeys } = diffGithubRepoSettings(baseline, edited);
      const parseResult = githubRepoSettingsSchema.safeParse(partial);
      if (!parseResult.success) {
        setError(`Validation error: ${parseResult.error.message}`);
        return;
      }
      const payloadSlice = parseResult.data;
      if (Object.keys(payloadSlice ?? {}).length === 0) {
        setError('No changes detected — adjust a field before submitting.');
        return;
      }

      const res = await requestRepoSettingsUpdate(
        o,
        r,
        payloadSlice,
        changedKeys,
      );

      if (!res.ok) {
        setError(res.error);
        return;
      }
      setApprovalSubmitted(res.data);

      await loadFromGithub(o, r);
    } catch (eventCaught) {
      setError(eventCaught instanceof Error ? eventCaught.message : 'Unexpected error');
    }
  }

  const presetSelections = useMemo(() => new Set<string>(
      Array.isArray(edited.branchRulesetPresetIds)
        ? edited.branchRulesetPresetIds.filter(
            value => typeof value === 'string' && !!value.trim(),
          ) as string[]
        : [],
  ), [edited.branchRulesetPresetIds]);

  const descriptionCatalog = isCatalog
    ? `Edit repository knobs backed by GitHub (registry-driven). Sensitive operations route to segregated approvals when flagged.`
    : `Load repository state, tweak fields, submit when ready. Sensitive operations require elevated approvers automatically.`;

  return (
    <>
      {presetAlertsPlacement === 'embedded' && presetsError ? (
        <Alert status="danger" title="Could not load ruleset presets">
          <Box>{presetsError}</Box>
        </Alert>
      ) : null}
      {presetAlertsPlacement === 'embedded' && loadingPresets ? (
        <Box>Loading branch preset catalogue…</Box>
      ) : null}
      <form onSubmit={submitHandler}>
        <Flex direction="column" gap="4">
          <Box>{descriptionCatalog}</Box>
          {approvalSubmitted ? (
            <Alert status="success" title="Approval request submitted">
              <Flex direction="column" gap="2">
                <Box>
                  Tracker status <strong>{approvalSubmitted.status}</strong>. Approval id{' '}
                  <RouterLink to={`/approvals/${approvalSubmitted.id}`}>
                    {(approvalSubmitted.id ?? '').slice(0, 8)}…
                  </RouterLink>
                </Box>
                <ButtonLink variant="secondary" href="/approvals/mine">
                  View queue
                </ButtonLink>
              </Flex>
            </Alert>
          ) : null}
          {error ? (
            <Alert status="danger" title="Submission failed">
              <Box>{error}</Box>
            </Alert>
          ) : null}
          {snapshot && !error ? (
            <Alert status="info" title="Hydrated snapshot">
              <Flex direction="column" gap="3">
                <strong>{snapshot.summary.fullName}</strong>
                {snapshot.summary.htmlUrl ? (
                  <a href={snapshot.summary.htmlUrl} rel="noreferrer" target="_blank">
                    Visit GitHub
                  </a>
                ) : null}
                {(snapshot.secretNamesActions?.length ||
                  snapshot.secretNamesDependabot?.length) &&
                (<Box>
                  <strong>Secret catalogues</strong>:
                  {(snapshot.secretNamesActions?.length ?? 0) +
                    (snapshot.secretNamesDependabot?.length ?? 0)}
                  {' '}entries (plaintext never returned). Rotary entries must be keyed via JSON payload.
                  </Box>
                )}
              </Flex>
            </Alert>
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
                  label="Owner (organisation or username)"
                  name="updOwner"
                  value={standaloneOwner}
                  onChange={next => setStandaloneOwner(next)}
                  placeholder="engineering"
                  isRequired
                />
              </Box>
              <Box style={{ flex: '1 1 200px' }}>
                <TextField
                  label="Repository"
                  name="updRepo"
                  value={standaloneRepo}
                  onChange={next => setStandaloneRepo(next)}
                  placeholder="payments"
                  isRequired
                />
              </Box>
              <Button
                type="button"
                variant="secondary"
                isDisabled={loadBusy}
                loading={loadBusy}
                onPress={() =>
                  loadFromGithub(standaloneOwner.trim(), standaloneRepo.trim())
                }
              >
                Load repository snapshot
              </Button>
            </Flex>
          ) : (
            <Flex align="center" direction="row" gap="4">
              <strong>
                Repo slug {props.catalogOwner}/{props.catalogRepo}
              </strong>
              <Button
                variant="secondary"
                type="button"
                loading={loadBusy}
                isDisabled={
                  loadBusy || !props.catalogOwner || !props.catalogRepo
                }
                onPress={() =>
                  loadFromGithub(props.catalogOwner.trim(), props.catalogRepo.trim())
                }
              >
                Refresh snapshot
              </Button>
            </Flex>
          )}

          {CATEGORY_SORT.map(cat => (
            categories.get(cat)?.length ? (
              <fieldset key={`cat:${cat}`} style={{ padding: '0.6rem', borderWidth: '1px' }}>
                <legend style={{ padding: '4px', textTransform: 'capitalize', fontWeight: 600 }}>
                  {cat}
                </legend>
                <Flex
                  gap="6"
                  direction="column"
                  style={{ flexWrap: 'wrap' }}
                >
                  {categories.get(cat)!
                    ?.filter(defRow => defRow.id !== 'branchRulesetPresetIds')
                    .map(defRow => (
                      <RepoSettingDynamicField
                        key={defRow.id}
                        def={defRow}
                        value={edited[defRow.id]}
                        onChange={val => updateField(defRow.id, val)}
                      />
                    ))}
                </Flex>
              </fieldset>
            ) : null
          ))}

          <fieldset style={{ padding: '0.6rem' }}>
            <legend style={{ fontWeight: 600 }}>Repo rules — preset catalogue</legend>
            <Flex direction="column" gap="2">
              {presets.map(presetOpt => (
                <Checkbox
                  key={presetOpt.id}
                  isSelected={presetSelections.has(presetOpt.id)}
                  onChange={selected => {
                    const nextSelections = new Set(presetSelections);
                    if (selected) {
                      nextSelections.add(presetOpt.id);
                    } else {
                      nextSelections.delete(presetOpt.id);
                    }
                    updateField(
                      'branchRulesetPresetIds',
                      [...nextSelections.values()],
                    );
                  }}
                >
                  <strong>{presetOpt.id}</strong> — {presetOpt.description}
                </Checkbox>
              ))}
            </Flex>
          </fieldset>

          <Flex direction="row" gap="3">
            <Button
              type="submit"
              variant="primary"
              isDisabled={
                submittingSettingsApproval || !(owner && repoName)
              }
              loading={submittingSettingsApproval}
            >
              Request settings update (dynamic routing by risk)
            </Button>
          </Flex>
        </Flex>
      </form>
    </>
  );
}
