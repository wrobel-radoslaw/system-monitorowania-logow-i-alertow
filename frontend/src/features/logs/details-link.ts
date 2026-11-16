/**
 * The Logs page passes its URL query (the filters and page) to the details page in router state,
 * so "Back to logs" returns to the same filtered list.
 */
export type DetailsLinkState = { logsSearch: string };

export function detailsPath(eventId: string) {
  return `/logs/${encodeURIComponent(eventId)}`;
}

/** Router state is untyped and can come from anywhere, so accept only a query string. */
export function backToLogsPath(state: unknown) {
  const search = (state as Partial<DetailsLinkState> | null)?.logsSearch;
  return typeof search === 'string' && search.startsWith('?') ? `/logs${search}` : '/logs';
}
