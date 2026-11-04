import { queryOptions } from '@tanstack/react-query';
import type { EventDto, EventQuery, PaginatedEventsDto } from '@/shared/types/events';
import { apiFetch } from './api-client';

function toSearchString(query: EventQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

export function eventsQueryOptions(query: EventQuery) {
  return queryOptions({
    queryKey: ['events', 'list', query],
    queryFn: ({ signal }) =>
      apiFetch<PaginatedEventsDto>(`/api/events${toSearchString(query)}`, { signal }),
  });
}

export function eventQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: ['events', 'detail', eventId],
    queryFn: ({ signal }) =>
      apiFetch<EventDto>(`/api/events/${encodeURIComponent(eventId)}`, { signal }),
  });
}
