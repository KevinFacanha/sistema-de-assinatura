import { Stepper } from '../../components/ui';

type PublicStep = 'entry' | 'otp' | 'review' | 'completed';

type PublicFlowHeaderProps = {
  title: string;
  description: string;
  currentStep: PublicStep;
};

const stepOrder: PublicStep[] = ['entry', 'otp', 'review', 'completed'];
const stepLabels: Record<PublicStep, string> = {
  entry: 'Acesso',
  otp: 'Validação',
  review: 'Revisão e assinatura',
  completed: 'Concluído',
};

function getStepStatus(step: PublicStep, currentStep: PublicStep) {
  const stepIndex = stepOrder.indexOf(step);
  const currentIndex = stepOrder.indexOf(currentStep);
  if (stepIndex < currentIndex) return 'completed' as const;
  if (stepIndex === currentIndex) return 'current' as const;
  return 'upcoming' as const;
}

export function PublicFlowHeader({ title, description, currentStep }: PublicFlowHeaderProps) {
  return (
    <header className="space-y-4">
      <Stepper
        steps={stepOrder.map((step) => ({
          id: step,
          label: stepLabels[step],
          status: getStepStatus(step, currentStep),
        }))}
      />
      <div>
        <h1 className="text-2xl font-semibold text-text-strong">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
    </header>
  );
}
