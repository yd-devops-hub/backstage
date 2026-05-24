function stableReplacer(val: unknown): unknown {
  if (val === undefined) {
    return null;
  }
  if (!val || typeof val !== 'object' || Array.isArray(val)) {
    return val;
  }
  return Object.keys(val as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, nextKey) => {
      acc[nextKey] = stableReplacer(
        (val as Record<string, unknown>)[nextKey],
      );
      return acc;
    }, {});
}

function stringify(value: unknown): string {
  return JSON.stringify(stableReplacer(value));
}

/** Deep-clone JSON-able objects (drops functions / Symbols). */
export function cloneSettings<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload)) as T;
}

/** Compare baseline vs edits and derive the sparse approvals payload plus changed IDs. */
export function diffGithubRepoSettings(
  baseline: Record<string, unknown>,
  edits: Record<string, unknown>,
  settingIds?: readonly string[],
): { partial: Record<string, unknown>; changedKeys: string[] } {
  const keys =
    settingIds ??
    Array.from(new Set([...Object.keys(baseline), ...Object.keys(edits)]));
  const partial: Record<string, unknown> = {};
  const changedKeys: string[] = [];

  for (const key of keys) {
    const before = baseline[key];
    const next = edits[key];
    const same = stringify(before) === stringify(next);
    if (!same && next !== undefined) {
      partial[key] = next;
      changedKeys.push(key);
    }
  }

  return { partial, changedKeys };
}
