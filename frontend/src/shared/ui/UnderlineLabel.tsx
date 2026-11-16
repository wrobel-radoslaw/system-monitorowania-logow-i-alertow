import type { ReactNode } from 'react';

type UnderlineLabelProps = {
  children: ReactNode;
  /** Space between the text and the line, as a Tailwind padding class. */
  gap?: string;
};

/**
 * Text of a nav link or tab. The 2px line sits on this span, so it is exactly as wide as the
 * text, and turns accent when the parent link (which needs the `group` class) is aria-current.
 */
export function UnderlineLabel({ children, gap = 'pb-1.5' }: UnderlineLabelProps) {
  return (
    <span
      className={`inline-block border-b-2 border-transparent transition-colors duration-200 group-aria-[current=page]:border-accent ${gap}`}
    >
      {children}
    </span>
  );
}
