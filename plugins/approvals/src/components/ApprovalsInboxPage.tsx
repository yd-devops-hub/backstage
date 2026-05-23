import {
  Content,
  EmptyState,
  InfoCard,
  Link,
  LinkButton,
  Progress,
  Table,
  TableColumn,
  WarningPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/frontend-plugin-api';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { approvalsApiRef } from '../api';
import type { ApprovalRequestDto } from '../types';
import { RequestStatus } from './RequestStatus';

export const ApprovalsInboxPage = () => {
  const api = useApi(approvalsApiRef);
  const [items, setItems] = useState<ApprovalRequestDto[] | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listInbox();
        if (!cancelled) setItems(res.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const handleApprove = useCallback(
    async (id: string) => {
      setBusyId(id);
      setError(null);
      try {
        await api.approve(id);
        setItems(prev => prev?.filter(item => item.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyId(null);
      }
    },
    [api],
  );

  const handleReject = useCallback(
    async (id: string) => {
      setBusyId(id);
      setError(null);
      try {
        await api.reject(id, 'Rejected from inbox');
        setItems(prev => prev?.filter(item => item.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyId(null);
      }
    },
    [api],
  );

  const columns = useMemo<TableColumn<ApprovalRequestDto>[]>(
    () => [
      {
        title: 'Action',
        field: 'actionType',
        highlight: true,
        width: '30%',
        render: row => (
          <Link to={`/approvals/${row.id}`}>{row.actionType}</Link>
        ),
      },
      {
        title: 'Status',
        field: 'status',
        width: '15%',
        cellStyle: { whiteSpace: 'nowrap' },
        render: row => <RequestStatus status={row.status} />,
      },
      {
        title: 'Requester',
        field: 'requesterRef',
        width: '25%',
      },
      {
        title: 'Created',
        field: 'createdAt',
        width: '20%',
        cellStyle: { whiteSpace: 'nowrap' },
        render: row => new Date(row.createdAt).toLocaleString(),
      },
      {
        title: '',
        field: 'id',
        sorting: false,
        width: '1%',
        cellStyle: { whiteSpace: 'nowrap', width: '1%' },
        headerStyle: { whiteSpace: 'nowrap', width: '1%' },
        render: row => (
          <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={busyId !== null}
              onClick={() => {
                void handleApprove(row.id);
              }}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              disabled={busyId !== null}
              onClick={() => {
                void handleReject(row.id);
              }}
            >
              Reject
            </Button>
            <LinkButton
              to={`/approvals/${row.id}`}
              color="primary"
              size="small"
              style={{ whiteSpace: 'nowrap' }}
            >
              View
            </LinkButton>
          </div>
        ),
      },
    ],
    [busyId, handleApprove, handleReject],
  );

  const rows = useMemo(() => items ?? [], [items]);

  if (!items && !error) {
    return <Progress />;
  }

  return (
    <Content>
      <Grid container spacing={3}>
        {error ? (
          <Grid item xs={12}>
            <WarningPanel severity="error" title="Error" message={error} />
          </Grid>
        ) : null}

        <Grid item xs={12}>
          <InfoCard
            title="Approvals inbox"
            subheader="Pending requests where you are an approver"
          >
            {rows.length === 0 ? (
              <EmptyState
                title="No pending approvals"
                missing="data"
                description="You have no approval requests waiting for your decision."
              />
            ) : (
              <Table
                columns={columns}
                data={rows}
                options={{
                  search: false,
                  paging: true,
                  pageSize: 10,
                  toolbar: false,
                  padding: 'dense',
                  tableLayout: 'auto',
                }}
              />
            )}
          </InfoCard>
        </Grid>
      </Grid>
    </Content>
  );
};
