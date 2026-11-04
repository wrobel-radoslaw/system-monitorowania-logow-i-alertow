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
    <nav aria-label={label} className="mb-6 overflow-x-auto">
      <ul className="flex gap-6">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  'block border-b-2 py-2 whitespace-nowrap',
                  isActive
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
