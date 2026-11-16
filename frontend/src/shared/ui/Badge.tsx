import type { ReactNode } from 'react';

export type BadgeTone = 'critical' | 'danger' | 'warn' | 'info' | 'success';

const toneClass: Record<BadgeTone, string> = {
  /** Filled, so it stands apart from the outlined `danger` badge. */
  critical: 'border-danger bg-danger text-bg',
  danger: 'border-current text-danger',
  warn: 'border-current text-warn',
  info: 'border-current text-info',
  success: 'border-current text-success',
};

type BadgeProps = {
  tone: BadgeTone;
  children: ReactNode;
};

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
