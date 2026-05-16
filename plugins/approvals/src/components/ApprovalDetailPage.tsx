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
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { approvalsApiRef } from '../api';
import type { ApprovalRequestDto } from '../types';

export const ApprovalDetailPage = () => {
  const { requestId } = useParams();
  const api = useApi(approvalsApiRef);
  const [row, setRow] = useState<ApprovalRequestDto | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  if (!requestId) {
    return <Alert status="danger" title="Missing id" icon />;
  }

  if (!row && !error) {
    return <Progress />;
  }

  if (error || !row) {
    return (
      <Container>
        <Alert status="danger" title="Could not load request" icon>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <CardBody>
          <Flex direction="column" gap="4">
            <Box>
              <strong>{row.actionType}</strong> · {row.status}
            </Box>
            <Box>Requester: {row.requesterRef}</Box>
            <Box>Created: {new Date(row.createdAt).toLocaleString()}</Box>
            {row.decidedAt ? (
              <Box>Decided: {new Date(row.decidedAt).toLocaleString()}</Box>
            ) : null}
            {row.decisionComment ? (
              <Box>Comment: {row.decisionComment}</Box>
            ) : null}
            <Box>
              Payload:
              <pre style={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(row.payload, null, 2)}
              </pre>
            </Box>
            {row.result ? (
              <Box>
                Result:
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(row.result, null, 2)}
                </pre>
              </Box>
            ) : null}
            {row.error ? (
              <Alert status="danger" title="Error" icon>
                {row.error}
              </Alert>
            ) : null}
            {row.status === 'pending' ? (
              <Flex gap="2">
                <Button
                  variant="secondary"
                  isDisabled={busy}
                  onPress={async () => {
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
                  }}
                >
                  Cancel request
                </Button>
              </Flex>
            ) : null}
          </Flex>
        </CardBody>
      </Card>
    </Container>
  );
};
