import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border-soft bg-white px-3 text-sm text-text-strong outline-none transition duration-150 ease-smooth focus:border-brand-secondary focus-visible:ring-2 focus-visible:ring-brand-secondary/30',
        className,
      )}
      {...props}
    />
  );
});
