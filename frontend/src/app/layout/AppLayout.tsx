import { useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { useDevice } from '@/shared/lib/useDevice';
import { Drawer } from './Drawer';
import { MainNav } from './MainNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

function Content() {
  return (
    <div className="max-w-[1200px]">
      <Outlet />
    </div>
  );
}

/**
 * Desktop: sidebar on the left.
 * Tablet: top bar + horizontal nav. Phone: top bar + bottom nav. Both open a drawer from the menu button.
 */
export function AppLayout() {
  const device = useDevice();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  if (device === 'desktop') {
    return (
      <div className="flex min-h-screen bg-bg text-text">
        <aside className="w-[240px] shrink-0 border-r border-border px-5 py-7">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1 px-10 pt-8 pb-12">
          <Content />
        </main>
      </div>
    );
  }

  function closeMenu() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-bg text-text">
      <TopBar
        menuOpen={menuOpen}
        onOpenMenu={() => setMenuOpen(true)}
        menuButtonRef={menuButtonRef}
      />
      {device === 'tablet' && (
        <MainNav variant="tabs" className="shrink-0 overflow-x-auto border-b border-border px-5" />
      )}
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-6 md:px-8 md:pt-7 md:pb-10">
        <Content />
      </main>
      {device === 'mobile' && (
        <MainNav
          variant="bottom"
          className="shrink-0 border-t border-border bg-bg px-1.5 pt-1.5 pb-3.5"
        />
      )}
      <Drawer open={menuOpen} onClose={closeMenu} />
    </div>
  );
}
