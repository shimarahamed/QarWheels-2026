import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Tailwind classes for the icon pill, e.g. "bg-emerald-500/10 text-emerald-600". */
  accent?: string;
  hint?: ReactNode;
};

/**
 * The KPI tile used across the customer, vendor and admin dashboards.
 * Sixteen pages were hand-rolling this same markup with slightly different
 * padding, label casing and icon treatment — this is the one version.
 */
export function StatCard({ label, value, icon, accent = 'bg-primary/10 text-primary', hint }: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        {icon && <span className={`icon-pill h-9 w-9 shrink-0 ${accent}`}>{icon}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A responsive row of StatCards — the layout every dashboard wants. */
export function StatCardGrid({ children }: { children: ReactNode }) {
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</section>;
}
