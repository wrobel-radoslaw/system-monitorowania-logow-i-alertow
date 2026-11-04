import type { ButtonHTMLAttributes } from 'react';

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

/** A rounded toggle, used for filters and range pickers. */
export function Pill({ active = false, className = '', ...props }: PillProps) {
  const state = active
    ? 'border-accent bg-accent-soft text-text'
    : 'border-border text-muted hover:bg-hover hover:text-text';
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-150 ${state} ${className}`}
      {...props}
    />
  );
}
