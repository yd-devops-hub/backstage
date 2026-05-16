import {
  Box,
  Card,
  CardBody,
  Container,
  Flex,
  Alert,
} from '@backstage/ui';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/frontend-plugin-api';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { approvalsApiRef } from '../api';
import type { ApprovalRequestDto } from '../types';

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

  if (!items && !error) {
    return <Progress />;
  }

  return (
    <Container>
      <Card>
        <CardBody>
          <Flex direction="column" gap="4">
            <Box>Your submitted approval requests.</Box>
            {error ? (
              <Alert status="danger" title="Error" icon>
                {error}
              </Alert>
            ) : null}
            <Flex direction="column" gap="3">
              {(items ?? []).map(row => (
                <Card key={row.id}>
                  <CardBody>
                    <Flex direction="column" gap="1">
                      <RouterLink to={`/approvals/${row.id}`}>
                        <strong>{row.actionType}</strong> · {row.status}
                      </RouterLink>
                      <Box>Created: {new Date(row.createdAt).toLocaleString()}</Box>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </Flex>
          </Flex>
        </CardBody>
      </Card>
    </Container>
  );
};
