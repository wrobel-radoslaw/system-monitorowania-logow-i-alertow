import type { ReactNode } from 'react';

export type StatusTone = 'ok' | 'pending' | 'error';

const dotClass: Record<StatusTone, string> = {
  ok: 'bg-accent',
  pending: 'bg-muted',
  error: 'bg-danger',
};

type StatusDotProps = {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
  title?: string;
};

/** Small colored dot followed by a status text, e.g. "Ingest live · 4 sources". */
export function StatusDot({ tone, children, className = '', title }: StatusDotProps) {
  return (
    <span title={title} className={`flex items-center gap-1.5 text-muted ${className}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dotClass[tone]}`} />
      {children}
    </span>
  );
}
