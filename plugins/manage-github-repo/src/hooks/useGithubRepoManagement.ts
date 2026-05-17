import { useApi } from '@backstage/frontend-plugin-api';
import { useCallback, useEffect, useState } from 'react';

import { manageGithubRepoApiRef } from '../api';
import type {
  BranchRulesetPresetOption,
  CreateGithubRepoPayload,
  GithubRepoSettingsPayload,
  GithubRepoSummary,
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
      .catch((e: Error) => {
        if (!cancelled) {
          setPresetsError(e.message);
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
    async (owner: string, repo: string) => {
      return api.getRepo(owner.trim(), repo.trim());
    },
    [api],
  );

  const createRepo = useCallback(
    async (payload: CreateGithubRepoPayload) => {
      return api.createRepo(payload);
    },
    [api],
  );

  const requestRepoSettingsUpdate = useCallback(
    (
      owner: string,
      repo: string,
      settings: GithubRepoSettingsPayload,
    ): Promise<RepoSettingsUpdateSubmitResult> => {
      return requestUpdate(owner.trim(), repo.trim(), settings);
    },
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

export type { GithubRepoSummary };
