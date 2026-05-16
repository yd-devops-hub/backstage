import { useSubmitApprovalRequest } from '@internal/backstage-plugin-approvals';

import type { CreateTeamSubmittedResponse } from '../types';

export type CreateTeamResult =
  | { ok: true; data: CreateTeamSubmittedResponse }
  | { ok: false; error: string };

/**
 * Submits a GitHub team creation via the approvals backend (`github-team-create`).
 */
export function useCreateGithubTeam() {
  const { submit, submitting } = useSubmitApprovalRequest('github-team-create');

  const createTeam = async (
    teamName: string,
    description?: string,
  ): Promise<CreateTeamResult> => {
    const result = await submit({
      teamName,
      ...(description ? { description } : {}),
    });
    if (!result.ok) {
      return result;
    }
    const d = result.data;
    return {
      ok: true,
      data: {
        id: d.id,
        status: d.status,
        actionType: d.actionType,
        createdAt: d.createdAt,
      },
    };
  };

  return { createTeam, submitting };
}
