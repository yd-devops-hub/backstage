import { useSubmitApprovalRequest } from '@internal/backstage-plugin-approvals';

import type {
  GithubRepoSettingsPayload,
  RepoSettingsUpdateSubmitResult,
  RepoSettingsUpdateSubmittedResponse,
} from '../types';

/**
 * Submits a GitHub repository settings change via the approvals backend
 * (`github-repo-settings-update`).
 */
export function useRequestRepoSettingsUpdate() {
  const { submit, submitting } = useSubmitApprovalRequest(
    'github-repo-settings-update',
  );

  const requestUpdate = async (
    owner: string,
    repo: string,
    settings: GithubRepoSettingsPayload,
  ): Promise<RepoSettingsUpdateSubmitResult> => {
    const result = await submit({ owner, repo, settings });
    if (!result.ok) {
      return result;
    }
    const d = result.data;
    const data: RepoSettingsUpdateSubmittedResponse = {
      id: d.id,
      status: d.status,
      actionType: d.actionType,
      createdAt: d.createdAt,
    };
    return { ok: true, data };
  };

  return { requestUpdate, submitting };
}
