import {
  CodeSnippet,
  Content,
  InfoCard,
  LinkButton,
  Progress,
  StructuredMetadataTable,
  WarningPanel,
} from '@backstage/core-components';
import { useApi, useRouteRef, identityApiRef } from '@backstage/frontend-plugin-api';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { approvalsApiRef } from '../api';
import { mineRouteRef } from '../routes';
import type { ApprovalRequestDto } from '../types';
import { RequestStatus } from './RequestStatus';

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function BackToMineLink() {
  const minePagePath = useRouteRef(mineRouteRef)();

  return (
    <LinkButton
      to={minePagePath}
      startIcon={<ArrowBackIcon />}
      color="primary"
    >
      Back to my approval requests
    </LinkButton>
  );
}

function JsonSection({ title, value }: { title: string; value: unknown }) {
  return (
    <InfoCard title={title}>
      <CodeSnippet
        language="json"
        text={formatJson(value)}
        showCopyCodeButton
        customStyle={{ margin: 0, fontSize: '0.8125rem' }}
      />
    </InfoCard>
  );
}

function RequestOverview({ row }: { row: ApprovalRequestDto }) {
  const metadata = useMemo(() => {
    const entries: Record<string, string> = {
      Requester: row.requesterRef,
      Created: new Date(row.createdAt).toLocaleString(),
    };

    if (row.decidedAt) {
      entries.Decided = new Date(row.decidedAt).toLocaleString();
    }
    if (row.decidedByRef) {
      entries['Decided by'] = row.decidedByRef;
    }
    if (row.decisionComment) {
      entries.Comment = row.decisionComment;
    }

    return entries;
  }, [row]);

  return (
    <InfoCard
      title={row.actionType}
      subheader={`Request ID: ${row.id}`}
      action={<RequestStatus status={row.status} />}
    >
      <StructuredMetadataTable metadata={metadata} dense />
    </InfoCard>
  );
}

function ApprovalDetailContent({
  row,
  error,
  busy,
  userRef,
  onApprove,
  onReject,
  onCancel,
}: {
  row: ApprovalRequestDto;
  error: string | null;
  busy: boolean;
  userRef: string | undefined;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onCancel: () => Promise<void>;
}) {
  const isRequester = userRef === row.requesterRef;
  const isApprover = Boolean(
    userRef && row.approverRefs.includes(userRef),
  );
  const canDecide = row.status === 'pending' && isApprover;
  const canCancel = row.status === 'pending' && isRequester;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <BackToMineLink />
      </Grid>

      {error ? (
        <Grid item xs={12}>
          <WarningPanel severity="error" title="Error" message={error} />
        </Grid>
      ) : null}

      <Grid item xs={12}>
        <RequestOverview row={row} />
      </Grid>

      <Grid item xs={12}>
        <JsonSection title="Payload" value={row.payload} />
      </Grid>

      {row.result ? (
        <Grid item xs={12}>
          <JsonSection title="Result" value={row.result} />
        </Grid>
      ) : null}

      {row.error ? (
        <Grid item xs={12}>
          <WarningPanel
            severity="error"
            title="Execution error"
            message={row.error}
          />
        </Grid>
      ) : null}

      {canDecide || canCancel ? (
        <Grid item xs={12}>
          <InfoCard title="Actions">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canDecide ? (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    disabled={busy}
                    onClick={() => {
                      void onApprove();
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    disabled={busy}
                    onClick={() => {
                      void onReject();
                    }}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              {canCancel ? (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  disabled={busy}
                  onClick={() => {
                    void onCancel();
                  }}
                >
                  Cancel request
                </Button>
              ) : null}
            </div>
          </InfoCard>
        </Grid>
      ) : null}
    </Grid>
  );
}

export const ApprovalDetailPage = () => {
  const { requestId } = useParams();
  const api = useApi(approvalsApiRef);
  const identityApi = useApi(identityApiRef);
  const [row, setRow] = useState<ApprovalRequestDto | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userRef, setUserRef] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    identityApi.getBackstageIdentity().then(identity => {
      if (!cancelled) {
        setUserRef(identity.userEntityRef);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [identityApi]);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.getRequest(requestId);
        if (!cancelled) setRow(r);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, requestId]);

  const handleApprove = async () => {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      setRow(await api.approve(row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      setRow(await api.reject(row.id, 'Rejected from approval detail'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      await api.cancel(row.id);
      setRow(await api.getRequest(row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!requestId) {
    return (
      <Content>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <BackToMineLink />
          </Grid>
          <Grid item xs={12}>
            <WarningPanel severity="error" title="Missing id" />
          </Grid>
        </Grid>
      </Content>
    );
  }

  if (!row && !error) {
    return <Progress />;
  }

  if (error && !row) {
    return (
      <Content>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <BackToMineLink />
          </Grid>
          <Grid item xs={12}>
            <WarningPanel
              severity="error"
              title="Could not load request"
              message={error}
            />
          </Grid>
        </Grid>
      </Content>
    );
  }

  if (!row) {
    return <Progress />;
  }

  return (
    <Content>
      <ApprovalDetailContent
        row={row}
        error={error}
        busy={busy}
        userRef={userRef}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
      />
    </Content>
  );
};
