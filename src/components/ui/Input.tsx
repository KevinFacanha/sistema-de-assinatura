import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-border-soft bg-white px-3 text-sm text-text-strong outline-none transition duration-150 ease-smooth placeholder:text-slate-400 focus:border-brand-secondary focus-visible:ring-2 focus-visible:ring-brand-secondary/30',
        className,
      )}
      {...props}
    />
  );
});
