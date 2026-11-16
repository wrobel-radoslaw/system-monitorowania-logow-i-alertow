import { NavLink } from 'react-router';
import { UnderlineLabel } from './UnderlineLabel';

export type TabItem = {
  to: string;
  label: string;
};

type TabsProps = {
  label: string;
  items: TabItem[];
};

/** Horizontal route tabs. Each tab is a NavLink, so the active one gets aria-current="page". */
export function Tabs({ label, items }: TabsProps) {
  return (
    <nav aria-label={label} className="mb-7 border-b border-border">
      {/* Below 1024px the tabs stay on one line and scroll sideways instead of wrapping. */}
      <ul className="flex gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible">
        {items.map((item) => (
          <li key={item.to} className="shrink-0">
            <NavLink
              to={item.to}
              className="group block rounded-t-lg px-2.5 pt-2 text-[15px] whitespace-nowrap md:px-3 md:text-[17px] text-muted transition-colors duration-150 hover:bg-hover hover:text-text aria-[current=page]:text-text"
            >
              <UnderlineLabel gap="pb-3">{item.label}</UnderlineLabel>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
