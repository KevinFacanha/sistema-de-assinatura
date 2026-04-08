import type { InputHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-muted">
      <input
        id={id}
        type="checkbox"
        className={cn(
          'h-4 w-4 rounded border border-border-soft text-brand-secondary focus:ring-brand-secondary/40',
          className,
        )}
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
