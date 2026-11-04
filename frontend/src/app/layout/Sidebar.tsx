import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router';
import { apiFetch } from '@/shared/lib/api-client';
import { MACHINE_IDS } from '@/shared/types/events';
import { useTheme } from './useTheme';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/logs', label: 'Logs' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/raports', label: 'Raports' },
  { to: '/ai', label: 'AI Analysis' },
];

const HEALTH_REFRESH_MS = 30_000;

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-text transition-colors duration-150 hover:border-muted hover:bg-hover"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/** Footer line, driven by /api/health so it never claims ingest is live while the API is down. */
function IngestStatus() {
  const { isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiFetch('/api/health', { signal }),
    refetchInterval: HEALTH_REFRESH_MS,
  });

  let text = `Ingest live · ${MACHINE_IDS.length} sources`;
  let dotClass = 'bg-accent';
  if (isPending) {
    text = 'Checking API...';
    dotClass = 'bg-muted';
  } else if (isError) {
    text = 'API unavailable';
    dotClass = 'bg-danger';
  }

  return (
    <p className="mt-auto flex items-center gap-2 px-3.5 text-[13px] text-muted">
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dotClass}`} />
      {text}
    </p>
  );
}

export function Sidebar() {
  return (
    <div className="flex h-full flex-col gap-7">
      <div className="flex items-center justify-between gap-3 px-3.5">
        <p className="text-xl font-bold">Log Monitor</p>
        <ThemeToggle />
      </div>

      <nav aria-label="Main">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="group block rounded-lg px-3.5 py-2.5 text-[17px] text-muted transition-colors duration-150 hover:bg-hover hover:text-text aria-[current=page]:text-text"
              >
                {/* The underline is on this span, so it is exactly as wide as the text. */}
                <span className="inline-block border-b-2 border-transparent pb-1.5 transition-colors duration-200 group-aria-[current=page]:border-accent">
                  {item.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <IngestStatus />
    </div>
  );
}
