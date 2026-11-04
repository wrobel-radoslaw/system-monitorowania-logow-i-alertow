import { NavLink } from 'react-router';

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
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className="group block rounded-t-lg px-3 pt-2 text-[17px] whitespace-nowrap text-muted transition-colors duration-150 hover:bg-hover hover:text-text aria-[current=page]:text-text"
            >
              {/* The underline is on this span, so it is exactly as wide as the text. */}
              <span className="inline-block border-b-2 border-transparent pb-3 transition-colors duration-200 group-aria-[current=page]:border-accent">
                {item.label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
