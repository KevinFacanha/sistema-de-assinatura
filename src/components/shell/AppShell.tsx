import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Topbar />
      <div className="mx-auto flex w-full max-w-[1320px]">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="page-container">
            <div className="page-content">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
