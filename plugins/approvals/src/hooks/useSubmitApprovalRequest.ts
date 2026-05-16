import { useApi } from '@backstage/frontend-plugin-api';
import { useCallback, useState } from 'react';

import { approvalsApiRef } from '../api';

import type { SubmitApprovalResult } from '../types';

/**
 * Submit a payload for an approval-gated action type.
 */
export function useSubmitApprovalRequest(actionType: string) {
  const api = useApi(approvalsApiRef);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (payload: unknown): Promise<SubmitApprovalResult> => {
      setSubmitting(true);
      try {
        return await api.submitRequest(actionType, payload);
      } finally {
        setSubmitting(false);
      }
    },
    [api, actionType],
  );

  return { submit, submitting };
}
