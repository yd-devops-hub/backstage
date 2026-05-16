import {
  Alert,
  Box,
  Button,
  ButtonLink,
  Card,
  CardBody,
  Container,
  Flex,
  TextField,
} from '@backstage/ui';
import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useCreateGithubTeam } from '../../hooks/useCreateGithubTeam';
import type { CreateTeamSubmittedResponse } from '../../types';

export const ManageGithubTeamPage = () => {
  const { createTeam, submitting } = useCreateGithubTeam();
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState<CreateTeamSubmittedResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSuccess(null);
    setError(null);

    const name = teamName.trim();
    if (!name) {
      setError('Team name is required.');
      return;
    }

    try {
      const desc = description.trim();
      const result = await createTeam(
        name,
        desc.length > 0 ? desc : undefined,
      );
      if (result.ok) {
        setSuccess(result.data);
        setTeamName('');
        setDescription('');
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    }
  };

  return (
    <Container>
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} noValidate>
            <Flex direction="column" gap="4">
              <Box>
                Requests creation of a team in your GitHub organization. A
                configured approver must approve the request in Backstage
                before the team is created on GitHub.
              </Box>
              {error ? (
                <Alert status="danger" title="Could not submit request" icon>
                  <Box>{error}</Box>
                </Alert>
              ) : null}
              {success ? (
                <Alert
                  status="success"
                  title="Approval request submitted"
                  icon
                >
                  <Flex direction="column" gap="2">
                    <Box>
                      Your request is <strong>{success.status}</strong>. An
                      approver will be notified. You can track it under{' '}
                      <RouterLink to={`/approvals/${success.id}`}>
                        approval {success.id.slice(0, 8)}…
                      </RouterLink>
                      .
                    </Box>
                    <ButtonLink variant="secondary" href="/approvals/mine">
                      View my requests
                    </ButtonLink>
                  </Flex>
                </Alert>
              ) : null}
              <TextField
                label="Team name"
                name="teamName"
                value={teamName}
                onChange={setTeamName}
                placeholder="e.g. platform-engineering"
                isRequired
              />
              <TextField
                label="Description"
                name="description"
                value={description}
                onChange={setDescription}
                placeholder="Optional; defaults to a standard message if omitted"
              />
              <Box>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={submitting}
                  loading={submitting}
                >
                  Request team creation
                </Button>
              </Box>
            </Flex>
          </form>
        </CardBody>
      </Card>
    </Container>
  );
};
