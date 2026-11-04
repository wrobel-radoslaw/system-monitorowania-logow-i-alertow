import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** The border lightens on hover. */
  hoverable?: boolean;
  /** No padding, for content that runs to the edges such as a table. */
  flush?: boolean;
};

export function Card({ hoverable = false, flush = false, className = '', ...props }: CardProps) {
  const hover = hoverable ? 'transition-colors duration-150 hover:border-muted' : '';
  const padding = flush ? '' : 'p-5';
  return (
    <div
      className={`rounded-xl border border-border bg-surface ${padding} ${hover} ${className}`}
      {...props}
    />
  );
}
