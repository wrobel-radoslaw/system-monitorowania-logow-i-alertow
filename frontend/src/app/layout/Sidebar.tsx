import { NavLink } from 'react-router';
import { useTheme } from './useTheme';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/logs', label: 'Logs' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/reports', label: 'Reports' },
  { to: '/ai', label: 'AI Analysis' },
];

// Active marker: 2px accent bar on the left (desktop) or underneath (mobile top bar).
const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block whitespace-nowrap border-b-2 px-4 py-3 lg:border-b-0 lg:border-l-2 lg:px-6 lg:py-2',
    isActive
      ? 'border-accent text-text-primary'
      : 'border-transparent text-text-muted hover:text-text-primary',
  ].join(' ');

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-wrap items-center justify-between lg:h-full lg:flex-col lg:flex-nowrap lg:items-stretch">
      <p className="px-4 py-4 font-semibold text-text-primary lg:px-6 lg:py-6">Log Monitor</p>

      <button
        type="button"
        onClick={toggleTheme}
        className="cursor-pointer px-4 py-4 text-left text-text-muted hover:text-text-primary lg:order-last lg:px-6"
      >
        {theme === 'dark' ? 'Light theme' : 'Dark theme'}
      </button>

      <nav aria-label="Main" className="w-full overflow-x-auto lg:flex-1">
        <ul className="flex lg:flex-col">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
