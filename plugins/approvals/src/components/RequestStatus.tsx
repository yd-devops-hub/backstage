import {
  StatusAborted,
  StatusError,
  StatusOK,
  StatusPending,
  StatusRunning,
  StatusWarning,
} from '@backstage/core-components';

export function RequestStatus({ status }: { status: string }) {
  switch (status) {
    case 'succeeded':
      return <StatusOK>{status}</StatusOK>;
    case 'pending':
      return <StatusPending>{status}</StatusPending>;
    case 'failed':
    case 'rejected':
      return <StatusError>{status}</StatusError>;
    case 'cancelled':
      return <StatusAborted>{status}</StatusAborted>;
    case 'approved':
      return <StatusRunning>{status}</StatusRunning>;
    default:
      return <StatusWarning>{status}</StatusWarning>;
  }
}
