import type { HTMLAttributes } from 'react';

/** Section heading inside a Card. */
export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-[17px] font-bold ${className}`} {...props} />;
}
