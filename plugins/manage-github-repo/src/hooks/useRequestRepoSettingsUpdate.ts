import { useSubmitApprovalRequest } from '@internal/backstage-plugin-approvals';

import type {
  GithubRepoSettingsPayload,
  RepoSettingsUpdateSubmitResult,
  RepoSettingsUpdateSubmittedResponse,
} from '../types';
import {
  githubRepoSettingsSchema,
  settingsPayloadTouchesHighSensitivity,
} from '@internal/backstage-plugin-manage-github-repo-common';

/**
 * Submits GitHub repository settings deltas — sensitive keys route via a hardened approval lane.
 */
export function useRequestRepoSettingsUpdate() {
  const regular = useSubmitApprovalRequest(
    'github-repo-settings-update',
  );
  const sensitive = useSubmitApprovalRequest(
    'github-repo-settings-sensitive-update',
  );

  const requestUpdate = async (
    owner: string,
    repo: string,
    settings: GithubRepoSettingsPayload,
    changedKeys: string[],
  ): Promise<RepoSettingsUpdateSubmitResult> => {
    /* Final schema guard mirrors backend enforcement (strict keys). */
    const parsedSlice = githubRepoSettingsSchema.safeParse(settings);
    if (!parsedSlice.success) {
      return {
        ok: false,
        error: `Schema validation blocked submission: ${parsedSlice.error.message}`,
      };
    }

    const keysToEvaluate = [
      ...new Set([
        ...changedKeys,
        ...Object.keys(parsedSlice.data as Record<string, unknown>),
      ]),
    ];

    const prefersSensitiveLane =
      settingsPayloadTouchesHighSensitivity(keysToEvaluate);
    const client = prefersSensitiveLane ? sensitive : regular;

    const result = await client.submit({
      owner,
      repo,
      settings: parsedSlice.data,
    });
    if (!result.ok) {
      return result;
    }
    const { data } = result;
    const response: RepoSettingsUpdateSubmittedResponse = {
      id: data.id,
      status: data.status,
      actionType: data.actionType,
      createdAt: data.createdAt,
    };
    return { ok: true, data: response };
  };

  return {
    requestUpdate,
    submitting: regular.submitting || sensitive.submitting,
  };
}
