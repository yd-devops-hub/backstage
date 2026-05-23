import { TestApiProvider, renderInTestApp } from '@backstage/frontend-test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { manageGithubRepoApiRef } from '../../api';
import { GithubTeamPicker } from './GithubTeamPicker';

describe('GithubTeamPicker', () => {
  const listGithubTeams = jest.fn();

  beforeEach(() => {
    listGithubTeams.mockReset();
  });

  it('loads teams for the selected organization', async () => {
    listGithubTeams.mockResolvedValue({
      items: [
        { slug: 'platform', name: 'Platform Engineering' },
        { slug: 'security', name: 'Security' },
      ],
    });

    const onChange = jest.fn();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [
            manageGithubRepoApiRef,
            {
              listGithubOrgs: jest.fn(),
              listGithubTeams,
              listBranchRulesetPresets: jest.fn(),
              getRepo: jest.fn(),
              createRepo: jest.fn(),
            },
          ],
        ]}
      >
        <GithubTeamPicker
          onChange={onChange}
          onBlur={() => undefined}
          onFocus={() => undefined}
          disabled={false}
          readonly={false}
          name="ownerTeam"
          schema={{ title: 'Owner Team', type: 'string' }}
          uiSchema={{ 'ui:options': { orgField: 'repoOwner' } }}
          formContext={{ formData: { repoOwner: 'yd-devops-hub' } }}
          idSchema={{ $id: 'root_ownerTeam' }}
        />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(listGithubTeams).toHaveBeenCalledWith('yd-devops-hub');
    });

    const select = screen.getByLabelText('Owner Team');
    await userEvent.selectOptions(select, 'platform');

    expect(onChange).toHaveBeenCalledWith('platform');
  });
});
