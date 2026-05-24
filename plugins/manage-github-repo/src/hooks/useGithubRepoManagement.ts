import { useApi } from '@backstage/frontend-plugin-api';
import { useCallback, useEffect, useState } from 'react';

import { manageGithubRepoApiRef } from '../api';
import type {
  BranchRulesetPresetOption,
  CreateGithubRepoPayload,
  GithubRepoSettingsPayload,
  RepoSettingsSnapshot,
  RepoSettingsUpdateSubmitResult,
} from '../types';

import { useRequestRepoSettingsUpdate } from './useRequestRepoSettingsUpdate';

export function useGithubRepoManagement() {
  const api = useApi(manageGithubRepoApiRef);
  const { requestUpdate, submitting: submittingSettingsApproval } =
    useRequestRepoSettingsUpdate();
  const [presets, setPresets] = useState<BranchRulesetPresetOption[]>([]);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingPresets(true);
    api
      .listBranchRulesetPresets()
      .then(res => {
        if (!cancelled) {
          setPresets(res.items);
          setPresetsError(null);
        }
      })
      .catch((event: Error) => {
        if (!cancelled) {
          setPresetsError(event.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPresets(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const loadRepo = useCallback(
    async (ownerSlug: string, repoSlug: string) => {
      return api.getRepo(ownerSlug.trim(), repoSlug.trim());
    },
    [api],
  );

  const createRepo = useCallback(
    async (payload: CreateGithubRepoPayload) => api.createRepo(payload),
    [api],
  );

  const requestRepoSettingsUpdate = useCallback(
    (
      owner: string,
      repo: string,
      settings: GithubRepoSettingsPayload,
      changedKeys: string[],
    ): Promise<RepoSettingsUpdateSubmitResult> =>
      requestUpdate(owner.trim(), repo.trim(), settings, changedKeys),
    [requestUpdate],
  );

  return {
    presets,
    presetsError,
    loadingPresets,
    loadRepo,
    createRepo,
    requestRepoSettingsUpdate,
    submittingSettingsApproval,
  };
}

export type { RepoSettingsSnapshot };
