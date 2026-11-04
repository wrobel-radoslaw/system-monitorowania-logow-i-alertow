// Event types from the API contract (docs/openapi.yaml).

export const SEVERITIES = ['INFO', 'WARN', 'ERROR', 'CRITICAL'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const EVENT_STATUSES = ['NEW', 'ACKNOWLEDGED', 'RESOLVED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

// The API has no machine list, so these are the generator's machines.
export const MACHINE_IDS = ['press-01', 'lathe-02', 'cnc-03', 'conveyor-04'] as const;

export type EventDto = {
  eventId: string;
  machineId: string;
  timestamp: string;
  severity: Severity;
  code: string;
  message: string;
  status: EventStatus;
};

export type PaginatedEventsDto = {
  items: EventDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/** Query parameters of GET /api/events. `from` is inclusive, `to` is exclusive. */
export type EventQuery = {
  machineId?: string;
  severity?: Severity;
  status?: EventStatus;
  from?: string;
  to?: string;
  /** Only the mock API supports this so far: the real backend ignores it. */
  search?: string;
  page?: number;
  pageSize?: number;
};
