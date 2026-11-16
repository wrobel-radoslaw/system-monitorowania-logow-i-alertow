import { NavLink } from 'react-router';
import { UnderlineLabel } from '@/shared/ui/UnderlineLabel';
import { NavIcon } from './NavIcon';
import { navItems } from './nav-items';

type Variant = 'sidebar' | 'tabs' | 'bottom';

const listClass: Record<Variant, string> = {
  sidebar: 'flex flex-col gap-1',
  tabs: 'flex gap-1',
  bottom: 'flex gap-0.5',
};

const linkClass: Record<Variant, string> = {
  sidebar:
    'block rounded-lg px-3.5 py-2.5 text-[17px] hover:bg-hover hover:text-text aria-[current=page]:text-text',
  tabs: 'block rounded-t-lg px-3 pt-3 text-[17px] whitespace-nowrap hover:bg-hover hover:text-text aria-[current=page]:text-text',
  bottom:
    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs hover:bg-hover hover:text-text aria-[current=page]:text-text',
};

const labelGap: Record<Variant, string> = {
  sidebar: 'pb-1.5',
  tabs: 'pb-3',
  bottom: 'pb-[3px]',
};

type MainNavProps = {
  variant: Variant;
  /** Accessible name of the <nav>. Only one "Main" nav is on screen at a time. */
  label?: string;
  /** Called after a link is clicked, e.g. to close the drawer. */
  onNavigate?: () => void;
  className?: string;
};

export function MainNav({ variant, label = 'Main', onNavigate, className = '' }: MainNavProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className={listClass[variant]}>
        {navItems.map((item) => (
          <li key={item.to} className={variant === 'bottom' ? 'flex-1' : undefined}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={`group text-muted transition-colors duration-150 ${linkClass[variant]}`}
            >
              {variant === 'bottom' && <NavIcon name={item.icon} />}
              <UnderlineLabel gap={labelGap[variant]}>
                {variant === 'bottom' ? item.shortLabel : item.label}
              </UnderlineLabel>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
