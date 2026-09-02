import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary">
          {icon || <Inbox className="h-8 w-8" />}
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
        {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again. If the problem continues, contact support.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 rounded-2xl bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {onRetry && (
          <Button onClick={onRetry} className="mt-5">
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function LoadingPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
