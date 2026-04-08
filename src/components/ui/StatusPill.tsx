import { cn } from '../../lib/cn';

export type StatusPillValue = 'draft' | 'awaiting_patient' | 'opened' | 'completed' | 'cancelled' | 'expired';

type StatusPillProps = {
  status: StatusPillValue;
  className?: string;
};

const statusStyles: Record<StatusPillValue, string> = {
  draft: 'bg-slate-100 text-slate-700',
  awaiting_patient: 'bg-[var(--status-waiting-bg)] text-[var(--status-waiting-fg)]',
  opened: 'bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]',
  completed: 'bg-[var(--status-completed-bg)] text-[var(--status-completed-fg)]',
  cancelled: 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]',
  expired: 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]',
};

const labelMap: Record<StatusPillValue, string> = {
  draft: 'Rascunho',
  awaiting_patient: 'Aguardando paciente',
  opened: 'Acesso iniciado',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', statusStyles[status], className)}>
      {labelMap[status]}
    </span>
  );
}
