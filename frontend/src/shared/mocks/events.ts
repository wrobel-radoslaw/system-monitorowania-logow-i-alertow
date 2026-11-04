import type { EventDto, EventStatus, Severity } from '@/shared/types/events';
import seededEvents from './events.json';

// events.json is generator output (see frontend/README.md). The generator has no status field and
// the backend starts every event as NEW, so a fixed mix is added to give the status filter data.
const STATUS_MIX: EventStatus[] = ['NEW', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'];

type FakeRow = [time: [number, number, number], Severity, string, string, string];

// Fake rows for designing the Logs page, newest first. Built in local time, so the Time column
// reads the same in every time zone.
const fakeRows: FakeRow[] = [
  [
    [12, 381, 0],
    'ERROR',
    'payments',
    'UPSTREAM_TIMEOUT',
    'POST /checkout 503 upstream timeout after 5000ms (db-primary)',
  ],
  [
    [12, 97, 1],
    'WARN',
    'postgres',
    'POOL_USAGE_HIGH',
    'connection pool usage 48/50, waiting clients: 17',
  ],
  [[11, 840, 2], 'INFO', 'api-gateway', 'REQUEST_OK', 'GET /v1/orders 200 42ms user=8f21'],
  [
    [11, 502, 3],
    'ERROR',
    'payments',
    'CHARGE_FAILED',
    'charge failed: context deadline exceeded order=ORD-99812',
  ],
  [[10, 977, 4], 'WARN', 'worker-queue', 'JOB_RETRY', 'retrying job invoice.render attempt=3/5'],
  [
    [10, 415, 5],
    'INFO',
    'auth-service',
    'TOKEN_REFRESHED',
    'token refreshed client=web session=a91c',
  ],
  [[9, 990, 6], 'INFO', 'worker-queue', 'SCALED', 'scaled replicas 8 → 12 (queue depth 5,240)'],
  [[9, 311, 7], 'WARN', 'api-gateway', 'RATE_LIMITED', 'rate limit hit client=partner-acme 429'],
  [
    [8, 764, 8],
    'ERROR',
    'worker-queue',
    'JOB_FAILED',
    'invoice.render failed: pdf renderer OOM (512Mi)',
  ],
  [[8, 120, 9], 'INFO', 'payments', 'REQUEST_OK', 'POST /refund 200 118ms'],
];

const fakeEvents: EventDto[] = fakeRows.map(
  ([[seconds, milliseconds, index], severity, machineId, code, message]) => ({
    eventId: `fake-log-${index + 1}`,
    machineId,
    timestamp: new Date(2026, 10, 4, 14, 5, seconds, milliseconds).toISOString(),
    severity,
    code,
    message,
    status: STATUS_MIX[index % STATUS_MIX.length],
  }),
);

/** Oldest first. The handlers sort newest first, as the backend does. */
export const mockEvents: EventDto[] = [
  ...seededEvents.map((event, index) => ({
    ...event,
    severity: event.severity as Severity,
    status: STATUS_MIX[index % STATUS_MIX.length],
  })),
  ...[...fakeEvents].reverse(),
];
