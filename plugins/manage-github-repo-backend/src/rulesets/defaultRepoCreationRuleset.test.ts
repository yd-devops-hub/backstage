import {
  DEFAULT_REPO_CREATION_RULESET,
  DEFAULT_REPO_CREATION_RULESET_NAME,
} from './defaultRepoCreationRuleset';

describe('defaultRepoCreationRuleset', () => {
  it('uses the policy ruleset name', () => {
    expect(DEFAULT_REPO_CREATION_RULESET_NAME).toBe('main');
    expect(DEFAULT_REPO_CREATION_RULESET.name).toBe('main');
  });

  it('targets the default branch token and policy rules', () => {
    expect(DEFAULT_REPO_CREATION_RULESET).toMatchObject({
      target: 'branch',
      enforcement: 'active',
      conditions: {
        ref_name: {
          exclude: [],
          include: ['~DEFAULT_BRANCH'],
        },
      },
      rules: [
        { type: 'deletion' },
        { type: 'non_fast_forward' },
        {
          type: 'pull_request',
          parameters: {
            required_approving_review_count: 1,
            dismiss_stale_reviews_on_push: true,
            require_code_owner_review: true,
            require_last_push_approval: true,
            required_review_thread_resolution: true,
            allowed_merge_methods: ['merge', 'squash', 'rebase'],
          },
        },
      ],
      bypass_actors: [
        {
          actor_id: 5,
          actor_type: 'RepositoryRole',
          bypass_mode: 'always',
        },
      ],
    });
  });
});
