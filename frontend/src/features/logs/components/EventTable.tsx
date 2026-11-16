import { Link, useLocation, useNavigate } from 'react-router';
import { formatTime, formatTimestamp } from '@/shared/lib/format';
import { useDevice } from '@/shared/lib/useDevice';
import { detailsPath, type DetailsLinkState } from '../details-link';
import type { EventDto } from '../types';
import { Table, TableRow, tableCell } from '@/shared/ui/Table';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

const headers = ['Time', 'Event ID', 'Machine', 'Level', 'Code', 'Status', 'Message'];
const cell = `${tableCell} py-[11px]`;
const monoCell = `${cell} truncate font-mono text-[13px]`;

/** Phones get one card per event instead of a table that would scroll sideways. */
function EventCards({ events, state }: { events: EventDto[]; state: DetailsLinkState }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((event) => (
        <li key={event.eventId}>
          <Link
            to={detailsPath(event.eventId)}
            state={state}
            className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 transition-colors duration-150 hover:border-muted"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <SeverityBadge severity={event.severity} />
                <StatusBadge status={event.status} />
              </span>
              <span
                title={formatTimestamp(event.timestamp)}
                className="font-mono text-[13px] text-muted"
              >
                {formatTime(event.timestamp)}
              </span>
            </span>
            <span className="flex min-w-0 items-baseline gap-2 font-mono text-[13px]">
              <span className="shrink-0 font-semibold">{event.machineId}</span>
              <span className="truncate text-muted" title={event.code}>
                {event.code}
              </span>
            </span>
            <span className="font-mono text-[13px] leading-normal break-words">
              {event.message}
            </span>
            <span className="truncate font-mono text-xs text-muted" title={event.eventId}>
              {event.eventId}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function EventTable({ events }: { events: EventDto[] }) {
  const device = useDevice();
  const navigate = useNavigate();
  const state: DetailsLinkState = { logsSearch: useLocation().search };
  if (device === 'mobile') return <EventCards events={events} state={state} />;

  // table-fixed + truncate keeps every row one line high; the full text is in the title tooltip.
  return (
    <Table
      headers={headers}
      minWidth="min-w-[1120px]"
      className="table-fixed"
      columns={
        <colgroup>
          <col className="w-[146px]" />
          <col className="w-[128px]" />
          <col className="w-[140px]" />
          <col className="w-[106px]" />
          <col className="w-[170px]" />
          <col className="w-[136px]" />
          <col />
        </colgroup>
      }
    >
      {events.map((event) => (
        // The whole row opens the details for mouse users; the message link stays for keyboard
        // users and for opening in a new tab.
        <TableRow
          key={event.eventId}
          onClick={() => navigate(detailsPath(event.eventId), { state })}
          className="cursor-pointer"
        >
          <td
            title={formatTimestamp(event.timestamp)}
            className={`${cell} font-mono text-[13px] text-muted`}
          >
            {formatTime(event.timestamp)}
          </td>
          <td title={event.eventId} className={`${monoCell} text-muted`}>
            {event.eventId}
          </td>
          <td title={event.machineId} className={monoCell}>
            {event.machineId}
          </td>
          <td className={cell}>
            <SeverityBadge severity={event.severity} />
          </td>
          <td title={event.code} className={monoCell}>
            {event.code}
          </td>
          <td className={cell}>
            <StatusBadge status={event.status} />
          </td>
          <td className={`${cell} font-mono text-[13px]`}>
            <Link
              to={detailsPath(event.eventId)}
              state={state}
              onClick={(clickEvent) => clickEvent.stopPropagation()}
              title={event.message}
              className="block truncate hover:underline"
            >
              {event.message}
            </Link>
          </td>
        </TableRow>
      ))}
    </Table>
  );
}
