import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { History } from 'lucide-react';
import type { BookingStatusHistoryEntry } from '@/lib/types';

const ROLE_LABEL: Record<string, string> = {
  business_owner: 'Owner',
  vendor_admin: 'Admin',
  vendor_manager: 'Manager',
  vendor_staff: 'Staff',
  vendor_cashier: 'Cashier',
  vendor_inventory: 'Inventory',
  customer: 'Customer',
  master_admin: 'QarWheel admin',
};

function toDate(value: BookingStatusHistoryEntry['at']): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** The audit trail every transition writes — shown as a vertical timeline on the job card. */
export function StatusHistoryTimeline({ history }: { history: BookingStatusHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        Activity
      </div>
      <div className="space-y-0">
        {[...history].reverse().map((entry, i) => {
          const date = toDate(entry.at);
          const isLast = i === history.length - 1;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                {!isLast && <span className="w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 pb-4">
                <p className="text-sm font-semibold">{entry.status}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABEL[entry.byRole] ?? entry.byRole}
                  {date ? ` · ${format(date, 'MMM d, h:mm a')}` : ''}
                </p>
                {entry.note && <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
