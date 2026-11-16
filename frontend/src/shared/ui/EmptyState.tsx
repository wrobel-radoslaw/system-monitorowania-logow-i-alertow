import type { ReactNode } from 'react';
import { Card } from './Card';

type EmptyStateProps = {
  message?: string;
  /** Optional next step, e.g. "Try a wider time range". Turns the line into a card. */
  hint?: string;
  /** Optional button, e.g. "Clear filters". Turns the line into a card. */
  action?: ReactNode;
};

export function EmptyState({ message = 'No data yet', hint, action }: EmptyStateProps) {
  if (!hint && !action) return <p className="text-muted">{message}</p>;

  return (
    <Card>
      <div role="status" className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="font-semibold">{message}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </Card>
  );
}
