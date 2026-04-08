import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div>
        <h2 className="text-base font-semibold text-text-strong">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
