import { cn } from '../../lib/cn';

type StepStatus = 'completed' | 'current' | 'upcoming';

type Step = {
  id: string;
  label: string;
  status: StepStatus;
};

type StepperProps = {
  steps: Step[];
  className?: string;
};

const stepStyles: Record<StepStatus, string> = {
  completed: 'bg-brand-tertiary text-white',
  current: 'bg-brand-secondary text-white',
  upcoming: 'bg-surface-2 text-text-muted',
};

export function Stepper({ steps, className }: StepperProps) {
  return (
    <ol className={cn('flex flex-wrap gap-2', className)}>
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-center gap-2">
          <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold', stepStyles[step.status])}>
            {index + 1}
          </span>
          <span className="text-xs font-medium text-text-muted">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
