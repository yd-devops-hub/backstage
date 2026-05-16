import {
  Box,
  Button,
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

  if (!items && !error) {
    return <Progress />;
  }

  return (
    <Container>
      <Card>
        <CardBody>
          <Flex direction="column" gap="4">
            <Box>Pending requests where you are an approver.</Box>
            {error ? (
              <Alert status="danger" title="Error" icon>
                {error}
              </Alert>
            ) : null}
            <Flex direction="column" gap="3">
              {(items ?? []).map(row => (
                <Card key={row.id}>
                  <CardBody>
                    <Flex direction="column" gap="2">
                      <Box>
                        <strong>{row.actionType}</strong> · {row.status}
                      </Box>
                      <Box>Requester: {row.requesterRef}</Box>
                      <Box>
                        Created: {new Date(row.createdAt).toLocaleString()}
                      </Box>
                      <Flex gap="2">
                        <Button
                          variant="primary"
                          size="small"
                          isDisabled={busyId !== null}
                          onPress={async () => {
                            setBusyId(row.id);
                            setError(null);
                            try {
                              await api.approve(row.id);
                              setItems(prev => prev?.filter(i => i.id !== row.id));
                            } catch (e) {
                              setError(
                                e instanceof Error ? e.message : String(e),
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          isDisabled={busyId !== null}
                          onPress={async () => {
                            setBusyId(row.id);
                            setError(null);
                            try {
                              await api.reject(row.id, 'Rejected from inbox');
                              setItems(prev =>
                                prev?.filter(i => i.id !== row.id),
                              );
                            } catch (e) {
                              setError(
                                e instanceof Error ? e.message : String(e),
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          Reject
                        </Button>
                        <RouterLink to={`/approvals/${row.id}`}>
                          Details
                        </RouterLink>
                      </Flex>
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
