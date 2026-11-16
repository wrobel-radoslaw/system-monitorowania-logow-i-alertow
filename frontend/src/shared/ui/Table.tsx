import type { HTMLAttributes, ReactNode } from 'react';
import { Card } from './Card';

type TableProps = {
  headers: string[];
  /** Headers that stay for screen readers but are not shown (e.g. an "Action" column). */
  hiddenHeaders?: string[];
  /** Below this width the table scrolls sideways inside the card, e.g. "min-w-[760px]". */
  minWidth: string;
  /** Extra classes on <table>, e.g. "table-fixed". */
  className?: string;
  /** Optional <colgroup> to fix column widths. */
  columns?: ReactNode;
  children: ReactNode;
};

/** Padding for every cell; the first and last cells line up with the card edge. */
export const tableCell = 'px-2 first:pl-5 last:pr-5';

export function Table({
  headers,
  hiddenHeaders = [],
  minWidth,
  className = '',
  columns,
  children,
}: TableProps) {
  return (
    <Card flush className="overflow-x-auto">
      <table className={`w-full border-collapse text-left ${minWidth} ${className}`}>
        {columns}
        <thead>
          <tr className="border-b border-border text-[13px] text-muted">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className={`${tableCell} py-3 font-normal ${
                  hiddenHeaders.includes(header) ? 'sr-only' : ''
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

/** Body row with a divider and a hover background. */
export function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-hover ${className}`}
      {...props}
    />
  );
}
