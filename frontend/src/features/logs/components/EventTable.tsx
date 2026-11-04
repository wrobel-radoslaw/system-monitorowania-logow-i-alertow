import { Link } from 'react-router';
import { formatTime, formatTimestamp } from '@/shared/lib/format';
import type { EventDto } from '@/shared/types/events';
import { Card } from '@/shared/ui/Card';
import { SeverityBadge } from './SeverityBadge';

const headers = ['Time', 'Level', 'Service', 'Message'];
const cell = 'px-2 py-[11px] first:pl-5 last:pr-5';

export function EventTable({ events }: { events: EventDto[] }) {
  return (
    <Card flush className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[146px]" />
          <col className="w-[106px]" />
          <col className="w-[166px]" />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-[13px] text-muted">
            {headers.map((header) => (
              <th key={header} scope="col" className="px-2 py-3 font-normal first:pl-5 last:pr-5">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.eventId}
              className="border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-hover"
            >
              <td
                title={formatTimestamp(event.timestamp)}
                className={`${cell} font-mono text-[13px] text-muted`}
              >
                {formatTime(event.timestamp)}
              </td>
              <td className={cell}>
                <SeverityBadge severity={event.severity} />
              </td>
              <td className={`${cell} truncate font-mono text-[13px]`}>{event.machineId}</td>
              <td className={`${cell} font-mono text-[13px]`}>
                <Link
                  to={`/logs/${encodeURIComponent(event.eventId)}`}
                  title={event.message}
                  className="block truncate hover:underline"
                >
                  {event.message}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
