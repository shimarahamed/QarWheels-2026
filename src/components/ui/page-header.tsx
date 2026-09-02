import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, icon, action }: PageHeaderProps) {
  return (
    <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow && (
            <Badge variant="outline" className="mb-4 h-8 gap-2 bg-primary/5 px-3 text-primary">
              {icon}
              {eyebrow}
            </Badge>
          )}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
