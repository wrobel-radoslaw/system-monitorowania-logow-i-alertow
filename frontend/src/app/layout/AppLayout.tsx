import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

/** A wrapping row: the sidebar sits on the left and stacks above the content on phones. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-wrap bg-bg text-text">
      <aside className="max-w-full flex-[1_1_240px] border-r border-border px-5 py-7">
        <Sidebar />
      </aside>
      <main className="min-w-0 flex-[999_1_560px] px-4 pt-8 pb-12 sm:px-10">
        <div className="max-w-[1200px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
