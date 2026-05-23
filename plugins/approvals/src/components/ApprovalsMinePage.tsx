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
import Grid from '@material-ui/core/Grid';
import { useEffect, useMemo, useState } from 'react';

import { approvalsApiRef } from '../api';
import type { ApprovalRequestDto } from '../types';
import { RequestStatus } from './RequestStatus';

const tableColumns: TableColumn<ApprovalRequestDto>[] = [
  {
    title: 'Action',
    field: 'actionType',
    highlight: true,
    width: '40%',
    render: row => <Link to={`/approvals/${row.id}`}>{row.actionType}</Link>,
  },
  {
    title: 'Status',
    field: 'status',
    width: '20%',
    cellStyle: { whiteSpace: 'nowrap' },
    render: row => <RequestStatus status={row.status} />,
  },
  {
    title: 'Created',
    field: 'createdAt',
    width: '25%',
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
      <LinkButton
        to={`/approvals/${row.id}`}
        color="primary"
        size="small"
        style={{ whiteSpace: 'nowrap' }}
      >
        View
      </LinkButton>
    ),
  },
];

export const ApprovalsMinePage = () => {
  const api = useApi(approvalsApiRef);
  const [items, setItems] = useState<ApprovalRequestDto[] | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listMine();
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
            title="My approval requests"
            subheader="Your submitted approval requests"
          >
            {rows.length === 0 ? (
              <EmptyState
                title="No approval requests"
                missing="data"
                description="You have not submitted any approval requests yet."
              />
            ) : (
              <Table
                columns={tableColumns}
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
