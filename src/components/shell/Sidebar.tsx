import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/cn';

const navItems = [
  { to: '/dashboard', label: 'Painel' },
  { to: '/requests/new', label: 'Nova solicitação' },
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border-soft bg-surface-1 lg:block">
      <div className="sticky top-20 space-y-5 px-4 py-5">
        <div className="rounded-lg border border-border-soft bg-white px-3 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-secondary">Navegação</p>
          <p className="mt-1 text-sm font-medium text-text-strong">Painel operacional</p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition duration-150 ease-smooth',
                  isActive
                    ? 'bg-white text-brand-primary shadow-soft'
                    : 'text-text-muted hover:bg-white hover:text-text-strong',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition duration-150 ease-smooth',
                      isActive ? 'bg-brand-secondary opacity-100' : 'bg-brand-secondary opacity-0 group-hover:opacity-50',
                    )}
                  />
                  <span className="pl-2">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
