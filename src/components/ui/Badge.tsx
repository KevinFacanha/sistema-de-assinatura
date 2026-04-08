import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700', className)}
      {...props}
    />
  );
}
