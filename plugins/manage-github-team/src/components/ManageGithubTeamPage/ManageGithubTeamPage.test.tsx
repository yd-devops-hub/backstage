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

  it('submits a github-team-create approval request', async () => {
    const user = userEvent.setup();
    server.use(
      rest.post('*/api/approvals/requests', async (req, res, ctx) => {
        const body = await req.json();
        expect(body).toEqual({
          actionType: 'github-team-create',
          payload: { teamName: 'my-team', description: 'A test team' },
        });
        return res(
          ctx.status(201),
          ctx.json({
            id: '11111111-1111-1111-1111-111111111111',
            actionType: 'github-team-create',
            requesterRef: 'user:default/guest',
            payload: body.payload,
            approverRefs: ['user:default/approver'],
            status: 'pending',
            decidedByRef: null,
            decisionComment: null,
            decidedAt: null,
            result: null,
            error: null,
            createdAt: new Date().toISOString(),
            updatedAt: null,
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
    await user.click(screen.getByRole('button', { name: /request team creation/i }));

    expect(
      await screen.findByText(/approval request submitted/i),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /approval 11111111/i })).toHaveAttribute(
      'href',
      '/approvals/11111111-1111-1111-1111-111111111111',
    );
  });

  it('shows an error when the backend returns a failure', async () => {
    const user = userEvent.setup();
    server.use(
      rest.post('*/api/approvals/requests', (_req, res, ctx) =>
        res(
          ctx.status(400),
          ctx.json({ error: 'Unknown approval action type: bad' }),
        ),
      ),
    );

    await renderInTestApp(<ManageGithubTeamPage />);

    await user.type(
      await screen.findByRole('textbox', { name: /team name/i }),
      'my-team',
    );
    await user.click(screen.getByRole('button', { name: /request team creation/i }));

    expect(
      await screen.findByText('Unknown approval action type: bad'),
    ).toBeInTheDocument();
  });
});
