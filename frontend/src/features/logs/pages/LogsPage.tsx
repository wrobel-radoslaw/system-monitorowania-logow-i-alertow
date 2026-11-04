import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { eventsQueryOptions } from '@/shared/lib/events-api';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Input } from '@/shared/ui/Input';
import { Loading } from '@/shared/ui/Loading';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Pill } from '@/shared/ui/Pill';
import { EventFilters } from '../components/EventFilters';
import { EventTable } from '../components/EventTable';
import { Pagination } from '../components/Pagination';
import { readFilters, readPage, toEventQuery, type FilterValues } from '../filters';

const REFRESH_MS = 5_000;

// The API takes one severity at a time, so "Errors" means ERROR. CRITICAL events show under "All".
const levels = [
  { value: '', label: 'All' },
  { value: 'ERROR', label: 'Errors' },
  { value: 'WARN', label: 'Warnings' },
  { value: 'INFO', label: 'Info' },
];

export function LogsPage() {
  // Filters live in the URL, so a filtered view survives reloads and the back button.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const page = readPage(searchParams);
  const [moreOpen, setMoreOpen] = useState(
    Boolean(filters.machineId || filters.status || filters.from || filters.to),
  );

  // Only the mock API can search and only it holds these services, so the real API gets neither.
  const usingMocks = import.meta.env.VITE_USE_MOCKS === 'true';

  const { data, error, isPending } = useQuery({
    ...eventsQueryOptions(toEventQuery(filters, page)),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  });

  function changeFilter(name: keyof FilterValues, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    setSearchParams(next, { replace: true });
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  function renderResults() {
    if (error) return <ErrorState error={error} />;
    if (isPending) return <Loading />;
    return (
      <>
        {data.items.length > 0 ? (
          <EventTable events={data.items} />
        ) : (
          <EmptyState message="No events match these filters" />
        )}
        {data.totalCount > 0 && (
          <Pagination
            page={page}
            totalPages={data.totalPages}
            shownCount={data.items.length}
            totalCount={data.totalCount}
            onPageChange={changePage}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Logs"
        subtitle={
          usingMocks
            ? 'Streaming from api-gateway, auth-service, payments, worker-queue'
            : 'Events from all machines'
        }
      />
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          {usingMocks && (
            <Input
              type="search"
              aria-label="Search logs"
              placeholder="Search logs, e.g. service:payments timeout"
              value={filters.search}
              onChange={(event) => changeFilter('search', event.target.value)}
              className="w-full max-w-[420px]"
            />
          )}
          <div role="group" aria-label="Level" className="flex flex-wrap gap-2">
            {levels.map((level) => (
              <Pill
                key={level.label}
                active={filters.severity === level.value}
                onClick={() => changeFilter('severity', level.value)}
              >
                {level.label}
              </Pill>
            ))}
            <Pill active={moreOpen} onClick={() => setMoreOpen((open) => !open)}>
              More filters
            </Pill>
          </div>
        </div>
        {moreOpen && (
          <EventFilters
            filters={filters}
            onChange={changeFilter}
            onClear={() => setSearchParams({}, { replace: true })}
          />
        )}
        {renderResults()}
      </div>
    </>
  );
}
