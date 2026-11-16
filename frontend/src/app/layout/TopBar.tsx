import type { Ref } from 'react';
import { IconButton } from './IconButton';
import { StatusDot } from './StatusDot';
import { NavIcon } from './NavIcon';
import { ThemeToggle } from './ThemeToggle';
import { useIngestStatus } from './useIngestStatus';

type TopBarProps = {
  menuOpen: boolean;
  onOpenMenu: () => void;
  menuButtonRef: Ref<HTMLButtonElement>;
};

/** Header for tablet and phone: menu button, app name, ingest state and theme toggle. */
export function TopBar({ menuOpen, onOpenMenu, menuButtonRef }: TopBarProps) {
  const status = useIngestStatus();

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <IconButton
          ref={menuButtonRef}
          label="Open menu"
          onClick={onOpenMenu}
          aria-expanded={menuOpen}
          aria-controls="app-drawer"
        >
          <NavIcon name="menu" />
        </IconButton>
        <p className="text-lg font-bold">Log Monitor</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusDot tone={status.tone} title={status.text} className="text-[13px]">
          {status.short}
        </StatusDot>
        <ThemeToggle />
      </div>
    </header>
  );
}
