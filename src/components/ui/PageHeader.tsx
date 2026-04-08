import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 border-b border-border-soft pb-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl font-semibold leading-tight text-text-strong">{title}</h1>
        {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
