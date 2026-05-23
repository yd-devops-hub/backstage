import { TestApiProvider, renderInTestApp } from '@backstage/frontend-test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { manageGithubRepoApiRef } from '../../api';
import { GithubOrgPicker } from './GithubOrgPicker';

describe('GithubOrgPicker', () => {
  const listGithubOrgs = jest.fn();

  beforeEach(() => {
    listGithubOrgs.mockReset();
  });

  it('loads organizations from the backend', async () => {
    listGithubOrgs.mockResolvedValue({
      items: [{ login: 'yd-devops-hub' }],
    });

    const onChange = jest.fn();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [
            manageGithubRepoApiRef,
            {
              listGithubOrgs,
              listGithubTeams: jest.fn(),
              listBranchRulesetPresets: jest.fn(),
              getRepo: jest.fn(),
              createRepo: jest.fn(),
            },
          ],
        ]}
      >
        <GithubOrgPicker
          onChange={onChange}
          onBlur={() => undefined}
          onFocus={() => undefined}
          disabled={false}
          readonly={false}
          name="repoOwner"
          schema={{ title: 'Owner', type: 'string' }}
          uiSchema={{}}
          idSchema={{ $id: 'root_repoOwner' }}
        />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(listGithubOrgs).toHaveBeenCalled();
    });

    expect(onChange).toHaveBeenCalledWith('yd-devops-hub');

    const select = screen.getByLabelText('Owner');
    await userEvent.selectOptions(select, 'yd-devops-hub');
    expect(onChange).toHaveBeenCalledWith('yd-devops-hub');
  });
});
