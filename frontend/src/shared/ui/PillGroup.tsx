import type { ReactNode } from 'react';

type PillGroupProps = {
  /** Read by screen readers as the name of the group, e.g. "Time range". */
  label: string;
  children: ReactNode;
};

/** A labelled row of Pills that wraps on narrow screens. */
export function PillGroup({ label, children }: PillGroupProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}
