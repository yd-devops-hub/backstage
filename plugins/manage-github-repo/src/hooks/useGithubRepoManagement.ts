import { useApi } from '@backstage/frontend-plugin-api';
import { useCallback, useEffect, useState } from 'react';

import { manageGithubRepoApiRef } from '../api';
import type {
  BranchRulesetPresetOption,
  CreateGithubRepoPayload,
  GithubRepoSettingsPayload,
  GithubRepoSummary,
} from '../types';

export function useGithubRepoManagement() {
  const api = useApi(manageGithubRepoApiRef);
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

  const updateRepo = useCallback(
    async (
      owner: string,
      repo: string,
      settings: GithubRepoSettingsPayload,
    ) => {
      return api.updateRepo(owner.trim(), repo.trim(), settings);
    },
    [api],
  );

  return {
    presets,
    presetsError,
    loadingPresets,
    loadRepo,
    createRepo,
    updateRepo,
  };
}

export type { GithubRepoSummary };
