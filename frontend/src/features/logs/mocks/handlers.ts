import { http, HttpResponse, type AnyHandler } from 'msw';
import { mockEvents } from '@/shared/mocks/events';
import type { EventDto, PaginatedEventsDto } from '@/shared/types/events';

function problem(status: number, title: string, detail: string) {
  return HttpResponse.json(
    { title, status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

/** Every word must match. `service:x` looks only at the machine; other words look at all text. */
function matchesSearch(event: EventDto, search: string | null) {
  const words = (search ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${event.machineId} ${event.code} ${event.message}`.toLowerCase();
  return words.every((word) =>
    word.startsWith('service:')
      ? event.machineId.toLowerCase().includes(word.slice('service:'.length))
      : text.includes(word),
  );
}

/**
 * GET /api/events and GET /api/events/{eventId}, behaving as docs/openapi.yaml describes.
 * `search` is the exception: only this mock supports it so far.
 */
export const handlers: AnyHandler[] = [
  http.get('*/api/events', ({ request }) => {
    const params = new URL(request.url).searchParams;
    const machineId = params.get('machineId');
    const severity = params.get('severity');
    const status = params.get('status');
    const from = params.get('from');
    const to = params.get('to');
    const search = params.get('search');
    const page = Number(params.get('page') ?? 1);
    const pageSize = Number(params.get('pageSize') ?? 50);

    const fromTime = from === null ? null : Date.parse(from);
    const toTime = to === null ? null : Date.parse(to);

    if (fromTime !== null && toTime !== null && fromTime >= toTime) {
      return problem(400, 'Bad Request', 'Data początkowa musi być wcześniejsza od końcowej.');
    }

    const matching = mockEvents
      .filter((event) => {
        const time = Date.parse(event.timestamp);
        return (
          (machineId === null || event.machineId === machineId) &&
          (severity === null || event.severity === severity) &&
          (status === null || event.status === status) &&
          (fromTime === null || time >= fromTime) &&
          (toTime === null || time < toTime) &&
          matchesSearch(event, search)
        );
      })
      .sort(
        (a, b) =>
          Date.parse(b.timestamp) - Date.parse(a.timestamp) || a.eventId.localeCompare(b.eventId),
      );

    const body: PaginatedEventsDto = {
      items: matching.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      totalCount: matching.length,
      totalPages: Math.ceil(matching.length / pageSize),
    };
    return HttpResponse.json(body);
  }),

  http.get('*/api/events/:eventId', ({ params }) => {
    const event = mockEvents.find((candidate) => candidate.eventId === params.eventId);
    return event
      ? HttpResponse.json(event)
      : problem(
          404,
          'Not Found',
          `Nie znaleziono zdarzenia o eventId '${String(params.eventId)}'.`,
        );
  }),
];
