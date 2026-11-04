import type { ReactNode } from 'react';

export type BadgeTone = 'danger' | 'warn' | 'info' | 'success';

const toneClass: Record<BadgeTone, string> = {
  danger: 'text-danger',
  warn: 'text-warn',
  info: 'text-info',
  success: 'text-success',
};

type BadgeProps = {
  tone: BadgeTone;
  children: ReactNode;
};

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full border border-current px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
