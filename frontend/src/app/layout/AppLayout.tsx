import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

/**
 * Desktop (lg+): fixed 240px sidebar on the left, separated by a 1px border.
 * Mobile/tablet: the sidebar becomes a top bar with a horizontal nav row.
 */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <aside className="border-b border-border lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-r lg:border-b-0">
        <Sidebar />
      </aside>
      <main className="p-4 sm:p-6 lg:ml-60">
        <Outlet />
      </main>
    </div>
  );
}
