import {
  EVENT_STATUSES,
  MACHINE_IDS,
  SEVERITIES,
  type EventQuery,
  type EventStatus,
  type Severity,
} from '@/shared/types/events';

export const PAGE_SIZE = 10;

/** Filter values as kept in the URL. An empty string means "no filter". */
export type FilterValues = {
  search: string;
  machineId: string;
  severity: string;
  status: string;
  from: string;
  to: string;
};

function oneOf(allowed: readonly string[], value: string | null) {
  return value !== null && allowed.includes(value) ? value : '';
}

function validDate(value: string | null) {
  return value !== null && !Number.isNaN(Date.parse(value)) ? value : '';
}

/** Reads the filters from the URL. Values edited by hand into something invalid are ignored. */
export function readFilters(params: URLSearchParams): FilterValues {
  return {
    search: params.get('search') ?? '',
    machineId: oneOf(MACHINE_IDS, params.get('machineId')),
    severity: oneOf(SEVERITIES, params.get('severity')),
    status: oneOf(EVENT_STATUSES, params.get('status')),
    from: validDate(params.get('from')),
    to: validDate(params.get('to')),
  };
}

export function readPage(params: URLSearchParams) {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function toUtc(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

/** Date inputs hold local time; the API receives UTC. */
export function toEventQuery(filters: FilterValues, page: number): EventQuery {
  return {
    search: filters.search.trim() || undefined,
    machineId: filters.machineId || undefined,
    severity: (filters.severity as Severity) || undefined,
    status: (filters.status as EventStatus) || undefined,
    from: toUtc(filters.from),
    to: toUtc(filters.to),
    page,
    pageSize: PAGE_SIZE,
  };
}
