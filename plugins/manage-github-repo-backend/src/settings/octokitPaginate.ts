import type { Octokit } from '@octokit/rest';

export async function iteratePaginatedEndPoints<T>(
  octokit: Octokit,
  requestMethod: (...args: unknown[]) => Promise<{ data: unknown }>,
  params: Record<string, unknown>,
): Promise<T[]> {
  const rows: T[] = [];
  for await (const res of octokit.paginate.iterator(
    requestMethod as never,
    params as never,
  )) {
    const chunk = (
      Array.isArray((res as { data: unknown }).data)
        ? (res as { data: unknown[] }).data
        : []
    ) as T[];
    rows.push(...chunk);
  }
  return rows;
}
