import { Outlet } from 'react-router-dom';

import { RequireAuth } from '../components/auth/RequireAuth';
import { AppShell } from '../components/shell';

export function AppLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}
