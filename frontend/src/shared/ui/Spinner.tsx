import type { ComponentProps } from 'react';

/**
 * Spinning loader, same API as the shadcn/ui Spinner but drawn inline, so it needs no icon
 * package. Size and colour come from `className` (default size-4, current text colour).
 * Pass role="presentation" and aria-hidden when a parent already announces the loading state.
 */
export function Spinner({ className = '', ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={`size-4 shrink-0 animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite] ${className}`}
      {...props}
    >
      <circle cx="12" cy="12" r="9" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}
