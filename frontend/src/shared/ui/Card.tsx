import type { HTMLAttributes } from 'react';

type Variant = 'default' | 'accent' | 'notice';

const variantClass: Record<Variant, string> = {
  default: 'border-border bg-surface',
  /** Draws the eye to one card, e.g. the probable cause. */
  accent: 'border-accent bg-surface',
  /** A confirmation or info banner. */
  notice: 'border-accent bg-accent-soft',
};

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  /** The border lightens on hover. */
  hoverable?: boolean;
  /** No padding, for content that runs to the edges such as a table. */
  flush?: boolean;
};

export function Card({
  variant = 'default',
  hoverable = false,
  flush = false,
  className = '',
  ...props
}: CardProps) {
  const hover = hoverable ? 'transition-colors duration-150 hover:border-muted' : '';
  const padding = flush ? '' : 'p-4 md:p-5';
  return (
    <div
      className={`rounded-xl border ${variantClass[variant]} ${padding} ${hover} ${className}`}
      {...props}
    />
  );
}
