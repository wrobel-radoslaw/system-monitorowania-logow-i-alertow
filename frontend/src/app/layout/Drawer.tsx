import { useEffect, useRef } from 'react';
import { IconButton } from './IconButton';
import { StatusDot } from './StatusDot';
import { MainNav } from './MainNav';
import { NavIcon } from './NavIcon';
import { ThemeToggle } from './ThemeToggle';
import { useIngestStatus } from './useIngestStatus';

// Shown in the design; these pages do not exist yet, so the entries are disabled.
const workspaceItems = ['Data sources', 'Alert rules', 'Settings', 'Help'];

const sectionTitle = 'px-3.5 text-xs tracking-[.06em] text-muted uppercase';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
};

/** Slide-in menu for tablet and phone. Stays mounted so it can animate; inert while closed. */
export function Drawer({ open, onClose }: DrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const status = useIngestStatus();

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 z-20 bg-black/55 transition-opacity duration-300 ${
          open ? 'cursor-pointer opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        id="app-drawer"
        aria-label="Menu"
        inert={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className={`absolute inset-y-0 left-0 z-30 flex w-[300px] max-w-[85%] flex-col gap-5 overflow-y-auto border-r border-border bg-bg p-4 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${
          open ? 'translate-x-0 shadow-[8px_0_32px_rgba(0,0,0,.35)]' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 pl-3.5">
          <p className="text-xl font-bold">Log Monitor</p>
          <IconButton ref={closeRef} label="Close menu" onClick={onClose}>
            <NavIcon name="close" size={18} />
          </IconButton>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={sectionTitle}>Monitoring</p>
          <MainNav variant="sidebar" label="Menu" onNavigate={onClose} />
        </div>

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-1.5">
          <p className={sectionTitle}>Workspace</p>
          <ul className="flex flex-col gap-1">
            {workspaceItems.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="block w-full rounded-lg px-3.5 py-2.5 text-left text-base text-muted"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 rounded-[10px] border border-border px-3.5 py-3">
          <div>
            <p className="text-sm font-semibold">Production</p>
            <p className="mt-0.5">
              <StatusDot tone={status.tone} className="text-xs">
                {status.text}
              </StatusDot>
            </p>
          </div>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
