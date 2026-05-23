/** User-facing label for catalog `Group` entities (GitHub teams). */
export const GITHUB_TEAM_KIND_LABEL = 'GitHub Team';
export const GITHUB_TEAMS_KIND_LABEL = 'GitHub Teams';

/** Map catalog kind values to display labels in filters and headers. */
export function displayKindLabel(kind: string | undefined): string {
  if (!kind) {
    return '';
  }
  return kind.toLowerCase() === 'group' ? GITHUB_TEAM_KIND_LABEL : kind;
}
