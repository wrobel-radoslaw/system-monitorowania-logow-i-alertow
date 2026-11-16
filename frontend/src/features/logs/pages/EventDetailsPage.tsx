import { useQuery } from '@tanstack/react-query';
import { useLocation, useParams } from 'react-router';
import { backToLogsPath } from '../details-link';
import { ApiError } from '@/shared/lib/api-client';
import { eventQueryOptions } from '../api/events-api';
import { formatTimestamp } from '@/shared/lib/format';
import type { EventDto } from '../types';
import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Loading } from '@/shared/ui/Loading';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusActions } from '../components/StatusActions';
import { StatusBadge } from '../components/StatusBadge';

function EventFields({ event }: { event: EventDto }) {
  const fields = [
    { label: 'Event ID', value: <span className="font-mono text-[13px]">{event.eventId}</span> },
    { label: 'Time', value: formatTimestamp(event.timestamp) },
    { label: 'Machine', value: <span className="font-mono text-[13px]">{event.machineId}</span> },
    { label: 'Level', value: <SeverityBadge severity={event.severity} /> },
    { label: 'Code', value: <span className="font-mono text-[13px]">{event.code}</span> },
    { label: 'Message', value: <span className="font-mono text-[13px]">{event.message}</span> },
    { label: 'Status', value: <StatusBadge status={event.status} /> },
  ];

  return (
    <Card>
      <dl className="grid grid-cols-1 items-baseline gap-x-8 gap-y-1 sm:grid-cols-[max-content_1fr] sm:gap-y-3">
        {fields.map((field) => (
          <div key={field.label} className="contents">
            <dt className="mt-3 text-sm text-muted first:mt-0 sm:mt-0">{field.label}</dt>
            <dd className="break-words">{field.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function EventDetailsPage() {
  const { eventId = '' } = useParams();
  const { data, error, isPending } = useQuery(eventQueryOptions(eventId));
  // Back to the list the user came from, with its filters and page.
  const backTo = backToLogsPath(useLocation().state);

  function renderContent() {
    if (error instanceof ApiError && error.status === 404) {
      return <EmptyState message="Event not found" />;
    }
    if (error) return <ErrorState error={error} />;
    if (isPending) return <Loading />;
    return (
      <div className="flex flex-col gap-4">
        <EventFields event={data} />
        <StatusActions event={data} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Event details"
        actions={<LinkButton to={backTo}>Back to logs</LinkButton>}
      />
      {renderContent()}
    </>
  );
}
