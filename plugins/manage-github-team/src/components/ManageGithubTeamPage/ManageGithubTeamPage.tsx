import {
  Content,
  InfoCard,
  Link,
  LinkButton,
  WarningPanel,
} from '@backstage/core-components';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import { FormEvent, useState } from 'react';

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
    <Content>
      <Grid container spacing={3}>
        {error ? (
          <Grid item xs={12}>
            <WarningPanel
              severity="error"
              title="Could not submit request"
              message={error}
            />
          </Grid>
        ) : null}

        {success ? (
          <Grid item xs={12}>
            <WarningPanel
              severity="info"
              title="Approval request submitted"
              message={
                <>
                  Your request is <strong>{success.status}</strong>. An
                  approver will be notified. You can track it under{' '}
                  <Link to={`/approvals/${success.id}`}>
                    approval {success.id.slice(0, 8)}…
                  </Link>
                  .
                </>
              }
            />
            <Box mt={2}>
              <LinkButton to="/approvals/mine" color="primary">
                View my requests
              </LinkButton>
            </Box>
          </Grid>
        ) : null}

        <Grid item xs={12} md={8} lg={6}>
          <InfoCard
            title="Create GitHub team"
            subheader="Requests creation of a team in your GitHub organization. A configured approver must approve the request in Backstage before the team is created on GitHub."
          >
            <form onSubmit={handleSubmit} noValidate>
              <TextField
                label="Team name"
                name="teamName"
                value={teamName}
                onChange={event => setTeamName(event.target.value)}
                placeholder="e.g. platform-engineering"
                required
                fullWidth
                margin="normal"
                variant="outlined"
              />
              <TextField
                label="Description"
                name="description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Optional; defaults to a standard message if omitted"
                fullWidth
                margin="normal"
                variant="outlined"
                multiline
                minRows={2}
              />
              <Box mt={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={submitting}
                  startIcon={
                    submitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : undefined
                  }
                >
                  Request team creation
                </Button>
              </Box>
            </form>
          </InfoCard>
        </Grid>
      </Grid>
    </Content>
  );
};
