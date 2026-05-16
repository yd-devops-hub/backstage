import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import {
  registerMswTestHooks,
  renderInTestApp,
} from '@backstage/frontend-test-utils';
import { ManageGithubTeamPage } from './ManageGithubTeamPage';

describe('ManageGithubTeamPage', () => {
  const server = setupServer();
  registerMswTestHooks(server);

  it('submits team creation to the backend and shows success', async () => {
    const user = userEvent.setup();
    server.use(
      rest.post('*/api/manage-github-team/create-team', async (req, res, ctx) => {
        const body = await req.json();
        expect(body).toEqual({
          teamName: 'my-team',
          description: 'A test team',
        });
        return res(
          ctx.status(201),
          ctx.json({
            message: 'Created',
            org: 'yd-devops-hub',
            githubTeamId: 42,
            htmlUrl: 'https://github.com/orgs/yd-devops-hub/teams/my-team',
          }),
        );
      }),
    );

    await renderInTestApp(<ManageGithubTeamPage />);

    await user.type(
      await screen.findByRole('textbox', { name: /team name/i }),
      'my-team',
    );
    await user.type(
      await screen.findByRole('textbox', { name: /description/i }),
      'A test team',
    );
    await user.click(screen.getByRole('button', { name: /create team/i }));

    expect(
      await screen.findByRole('link', { name: /open team on github/i }),
    ).toHaveAttribute(
      'href',
      'https://github.com/orgs/yd-devops-hub/teams/my-team',
    );
  });

  it('shows an error when the backend returns a failure', async () => {
    const user = userEvent.setup();
    server.use(
      rest.post('*/api/manage-github-team/create-team', (_req, res, ctx) =>
        res(ctx.status(503), ctx.json({ error: 'Integration not configured' })),
      ),
    );

    await renderInTestApp(<ManageGithubTeamPage />);

    await user.type(
      await screen.findByRole('textbox', { name: /team name/i }),
      'my-team',
    );
    await user.click(screen.getByRole('button', { name: /create team/i }));

    expect(
      await screen.findByText('Integration not configured'),
    ).toBeInTheDocument();
  });
});
