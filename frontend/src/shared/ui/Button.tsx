import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';

type Variant = 'default' | 'primary';

const base =
  'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-[9px] text-sm transition duration-150 disabled:cursor-default disabled:opacity-50';

const variants: Record<Variant, string> = {
  default: 'border-border text-text enabled:hover:border-muted enabled:hover:bg-hover',
  primary: 'border-accent bg-accent font-semibold text-on-accent hover:brightness-108',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = 'default', className = '', ...props }: ButtonProps) {
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}

/** A link that looks like a default button. */
export function LinkButton({ className = '', ...props }: LinkProps) {
  return (
    <Link
      className={`${base} border-border text-text hover:border-muted hover:bg-hover ${className}`}
      {...props}
    />
  );
}
