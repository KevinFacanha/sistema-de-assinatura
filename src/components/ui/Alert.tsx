import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const alertClasses: Record<AlertVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

export function Alert({ variant = 'info', className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('rounded-md border px-3 py-2 text-sm', alertClasses[variant], className)}
      {...props}
    />
  );
}
