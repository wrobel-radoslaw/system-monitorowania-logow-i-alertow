import type { ButtonHTMLAttributes, Ref } from 'react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Accessible name and tooltip; the icon itself is decorative. */
  label: string;
  ref?: Ref<HTMLButtonElement>;
};

/** 40×40 bordered button holding only an icon: theme toggle, menu, close. */
export function IconButton({ label, className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-text transition-colors duration-150 hover:border-muted hover:bg-hover ${className}`}
      {...props}
    />
  );
}
