import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[100px] w-full rounded-md border border-border-soft bg-white px-3 py-2 text-sm text-text-strong outline-none transition duration-150 ease-smooth placeholder:text-slate-400 focus:border-brand-secondary focus-visible:ring-2 focus-visible:ring-brand-secondary/30',
        className,
      )}
      {...props}
    />
  );
});
