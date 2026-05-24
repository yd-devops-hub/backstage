import { render, screen, waitFor } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { RepoSettingsSnapshot } from '../types';
import { MemoryRouter } from 'react-router-dom';

import { GithubRepoSettingsForm } from './GithubRepoSettingsForm';

function demoSnapshot(): RepoSettingsSnapshot {
  const summary = {
    owner: 'demo-org',
    name: 'demo-repo',
    fullName: 'demo-org/demo-repo',
    defaultBranch: 'primary',
    deleteBranchOnMerge: false,
    htmlUrl: 'https://github.com/demo-org/demo-repo',
    private: false,
  };

  return {
    ...summary,
    summary,
    settings: {
      defaultBranch: 'primary',
    },
    managedRulesetPresetIds: ['require-pull-request'],
  };
}

describe('GithubRepoSettingsForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hydrates snapshots from GH when catalog tab renders', async () => {
    const loadRepoMock = jest.fn(() => Promise.resolve(demoSnapshot()));
    render(
      <MemoryRouter>
        <GithubRepoSettingsForm
          mode="catalog"
          catalogOwner="demo-org"
          catalogRepo="demo-repo"
          presetsError={null}
          loadingPresets={false}
          presets={[]}
          loadRepo={loadRepoMock}
          requestRepoSettingsUpdate={jest.fn()}
          submittingSettingsApproval={false}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(loadRepoMock).toHaveBeenCalledWith('demo-org', 'demo-repo'));
    await screen.findByText(/Hydrated snapshot/);
    await screen.findByText(/demo-org\/demo-repo/);
  });
});
