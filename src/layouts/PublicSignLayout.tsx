import { Outlet } from 'react-router-dom';

export function PublicSignLayout() {
  return (
    <div className="min-h-screen bg-surface-0">
      <header className="border-b border-border-soft bg-white">
        <div className="mx-auto flex h-14 w-full max-w-[980px] items-center px-4 sm:px-6">
          <p className="font-display text-lg font-semibold text-brand-primary">ClinicalSign</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-2xl rounded-lg border border-border-soft bg-white p-6 shadow-soft sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
