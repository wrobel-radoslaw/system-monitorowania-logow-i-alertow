import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 min-w-0 rounded-lg border border-border bg-bg px-3.5 text-[15px] text-text placeholder:text-muted ${className}`}
      {...props}
    />
  );
}
