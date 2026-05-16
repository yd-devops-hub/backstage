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
import { useCreateGithubTeam } from '../../hooks/useCreateGithubTeam';
import type { CreateTeamSuccessResponse } from '../../types';

export const ManageGithubTeamPage = () => {
  const { createTeam } = useCreateGithubTeam();
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CreateTeamSuccessResponse | null>(
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

    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} noValidate>
            <Flex direction="column" gap="4">
              <Box>
                Creates a team in your GitHub organization using the GitHub
                integration (for example a GitHub App) configured in Backstage.
              </Box>
              {error ? (
                <Alert status="danger" title="Could not create team" icon>
                  <Box>{error}</Box>
                </Alert>
              ) : null}
              {success ? (
                <Alert status="success" title={success.message} icon>
                  <Flex direction="column" gap="2">
                    <Box>
                      Organization: {success.org} · Team ID:{' '}
                      {success.githubTeamId}
                    </Box>
                    <ButtonLink
                      href={success.htmlUrl}
                      variant="secondary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open team on GitHub
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
                  Create team
                </Button>
              </Box>
            </Flex>
          </form>
        </CardBody>
      </Card>
    </Container>
  );
};
