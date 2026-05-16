/** @public */
export type ApprovalRequestDto = {
  id: string;
  actionType: string;
  requesterRef: string;
  payload: unknown;
  approverRefs: string[];
  status: string;
  decidedByRef: string | null;
  decisionComment: string | null;
  decidedAt: string | null;
  result: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string | null;
};

/** @public */
export type SubmitApprovalResult =
  | { ok: true; data: ApprovalRequestDto }
  | { ok: false; error: string };
