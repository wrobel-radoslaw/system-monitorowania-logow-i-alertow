import { StatusDot } from './StatusDot';
import { MainNav } from './MainNav';
import { ThemeToggle } from './ThemeToggle';
import { useIngestStatus } from './useIngestStatus';

/** Desktop navigation (1024px and up). Smaller screens get the top bar and drawer instead. */
export function Sidebar() {
  const status = useIngestStatus();

  return (
    <div className="flex h-full flex-col gap-7">
      <div className="flex items-center justify-between gap-3 px-3.5">
        <p className="text-xl font-bold">Log Monitor</p>
        <ThemeToggle />
      </div>

      <MainNav variant="sidebar" />

      <p className="mt-auto px-3.5">
        <StatusDot tone={status.tone} className="gap-2 text-[13px]">
          {status.text}
        </StatusDot>
      </p>
    </div>
  );
}
