import { useApi, fetchApiRef } from '@backstage/frontend-plugin-api';
import { useCallback } from 'react';
import type { CreateTeamSuccessResponse } from '../types';

export type CreateTeamResult =
  | { ok: true; data: CreateTeamSuccessResponse }
  | { ok: false; error: string };

/**
 * Calls manage-github-team-backend `POST /create-team`.
 */
export function useCreateGithubTeam() {
  const { fetch } = useApi(fetchApiRef);

  const createTeam = useCallback(
    async (teamName: string, description?: string): Promise<CreateTeamResult> => {
      const response = await fetch(
        'plugin://manage-github-team/create-team',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamName,
            ...(description ? { description } : {}),
          }),
        },
      );

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }

      if (!response.ok) {
        const message =
          typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          typeof (body as { error: unknown }).error === 'string'
            ? (body as { error: string }).error
            : `Request failed (${response.status})`;
        return { ok: false, error: message };
      }

      return { ok: true, data: body as CreateTeamSuccessResponse };
    },
    [fetch],
  );

  return { createTeam };
}
