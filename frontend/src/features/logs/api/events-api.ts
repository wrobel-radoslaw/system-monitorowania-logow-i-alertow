import { queryOptions } from '@tanstack/react-query';
import type { EventDto, EventQuery, EventStatus, PaginatedEventsDto } from '../types';
import { apiFetch } from '@/shared/lib/api-client';

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
    queryKey: [...eventListsKey, query],
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

/** Prefix of every event list query, for invalidating all lists at once. */
export const eventListsKey = ['events', 'list'] as const;

/**
 * PATCH /api/events/{eventId}/status. The backend only applies the change while the event still
 * has `expectedStatus`; otherwise it answers 409, so two people can't overwrite each other.
 */
export function changeEventStatus(
  eventId: string,
  expectedStatus: EventStatus,
  status: EventStatus,
) {
  return apiFetch<EventDto>(`/api/events/${encodeURIComponent(eventId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ expectedStatus, status }),
  });
}
