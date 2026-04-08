import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-0">
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1320px] grid-cols-1 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <main className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[460px]">
            <Outlet />
          </div>
        </main>

        <aside className="relative hidden overflow-hidden border-l border-border-soft p-8 lg:flex lg:items-center lg:justify-center xl:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 scale-[1.04] bg-cover bg-center bg-no-repeat blur-[1.5px]"
            style={{ backgroundImage: "url('/fundologin.jpeg')" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0f1f30]/90 via-[#1a2b3c]/82 to-[#1b3650]/86"
          />
          <div aria-hidden className="pointer-events-none absolute -left-14 top-12 h-56 w-56 rounded-full bg-brand-secondary/18 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute bottom-10 right-8 h-64 w-64 rounded-full bg-emerald-500/12 blur-3xl" />

          <div className="relative w-full max-w-[560px] rounded-2xl border border-white/18 bg-white/12 p-6 text-slate-100 shadow-md backdrop-blur-[3px] xl:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">Fluxo seguro</p>
            <h2 className="mt-3 max-w-md font-display text-3xl font-semibold leading-tight text-white">
              Assinatura digital simples para documentos clínicos.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-100/95">
              O profissional envia um único link e acompanha cada etapa: acesso, validação de código, aceite e assinatura
              final do paciente.
            </p>

            <div className="mt-7 space-y-3">
              <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="text-xs text-slate-100/85">Processo da solicitação</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/15 bg-white/12 p-3">
                    <p className="text-xs text-slate-100/80">Profissional</p>
                    <p className="mt-1 text-sm font-semibold text-white">Assina e compartilha</p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/12 p-3">
                    <p className="text-xs text-slate-100/80">Paciente</p>
                    <p className="mt-1 text-sm font-semibold text-white">Valida e conclui</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white/18 bg-white/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-100/80">Acesso</p>
                  <p className="mt-1 text-sm font-semibold text-white">Token único</p>
                </div>
                <div className="rounded-lg border border-white/18 bg-white/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-100/80">Validação</p>
                  <p className="mt-1 text-sm font-semibold text-white">Código de acesso</p>
                </div>
                <div className="rounded-lg border border-white/18 bg-white/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-100/80">Evidências</p>
                  <p className="mt-1 text-sm font-semibold text-white">Trilha de eventos</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
