import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { ApiError } from '@/shared/lib/api-client';
import { eventQueryOptions } from '@/shared/lib/events-api';
import { formatTimestamp } from '@/shared/lib/format';
import type { EventDto } from '@/shared/types/events';
import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Loading } from '@/shared/ui/Loading';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SeverityBadge } from '../components/SeverityBadge';

function EventFields({ event }: { event: EventDto }) {
  const fields = [
    { label: 'Event ID', value: <span className="font-mono text-[13px]">{event.eventId}</span> },
    { label: 'Time', value: formatTimestamp(event.timestamp) },
    { label: 'Service', value: <span className="font-mono text-[13px]">{event.machineId}</span> },
    { label: 'Level', value: <SeverityBadge severity={event.severity} /> },
    { label: 'Code', value: <span className="font-mono text-[13px]">{event.code}</span> },
    { label: 'Message', value: <span className="font-mono text-[13px]">{event.message}</span> },
    { label: 'Status', value: event.status },
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

  function renderContent() {
    if (error instanceof ApiError && error.status === 404) {
      return <EmptyState message="Event not found" />;
    }
    if (error) return <ErrorState error={error} />;
    if (isPending) return <Loading />;
    return <EventFields event={data} />;
  }

  return (
    <>
      <PageHeader
        title="Event details"
        actions={<LinkButton to="/logs">Back to logs</LinkButton>}
      />
      {renderContent()}
    </>
  );
}
