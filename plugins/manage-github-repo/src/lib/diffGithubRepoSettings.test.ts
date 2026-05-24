import { diffGithubRepoSettings } from './diffGithubRepoSettings';

describe('diffGithubRepoSettings', () => {
  it('captures deltas only where JSON differs post-stabilisation', () => {
    const baseline = { allowSquashMerge: true, homepage: '' } as Record<
      string,
      unknown
    >;
    const edits = { ...baseline, allowSquashMerge: false, topics: ['a'] };
    const { partial, changedKeys } = diffGithubRepoSettings(baseline, edits);

    expect(changedKeys.sort()).toEqual(['allowSquashMerge', 'topics'].sort());
    expect(partial).toMatchObject({
      allowSquashMerge: false,
      topics: ['a'],
    });
  });

  it('drops identical branches', () => {
    const { partial, changedKeys } = diffGithubRepoSettings({}, {});
    expect(partial).toEqual({});
    expect(changedKeys).toEqual([]);
  });
});
