'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Car, Clock3, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Booking, BookingStatus, WithId } from '@/lib/types';
import { bookingScheduleDate } from '@/lib/vendor-schedule';

/**
 * The command center's kanban — the live shop floor at a glance. Columns are
 * the forward-progress spine of BOOKING_TRANSITIONS; side-exits (Declined,
 * Cancelled, NoShow) don't get a column here since they're done, not in
 * flight — they stay visible in the Bookings table's own tabs instead.
 */
const COLUMNS: { status: BookingStatus; label: string; accent: string }[] = [
  { status: 'Pending', label: 'Requests', accent: 'border-amber-500/30 bg-amber-500/5' },
  { status: 'Confirmed', label: 'Confirmed', accent: 'border-sky-500/30 bg-sky-500/5' },
  { status: 'VehicleReceived', label: 'Vehicle in', accent: 'border-indigo-500/30 bg-indigo-500/5' },
  { status: 'InProgress', label: 'In progress', accent: 'border-primary/30 bg-primary/5' },
  { status: 'ReadyForPickup', label: 'Ready for pickup', accent: 'border-emerald-500/30 bg-emerald-500/5' },
];

function JobCardTile({ booking }: { booking: WithId<Booking> }) {
  const router = useRouter();
  const preferredDate = bookingScheduleDate(booking.bookingDate);
  return (
    <button
      type="button"
      onClick={() => router.push(`/vendor/dashboard/jobs/${booking.id}`)}
      className="group flex w-full flex-col gap-2 rounded-xl border border-border/60 bg-background/80 p-3 text-left transition-all duration-200 hover:border-primary/40 hover:bg-background hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold">{booking.customerName || 'Customer'}</p>
        <Badge variant="outline" className="shrink-0 text-[10px]">{preferredDate ? format(preferredDate, 'MMM d') : 'Date unavailable'}</Badge>
      </div>
      <p className="truncate text-xs text-muted-foreground">{booking.serviceName}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Car className="h-3 w-3 shrink-0" />
        <span className="truncate">{booking.carDescription ?? 'Vehicle details unavailable'}</span>
      </div>
      <div className="flex items-center justify-between border-t border-border/50 pt-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <UserCog className="h-3 w-3" />
          {booking.assignedStaffName ?? 'Unassigned'}
        </div>
        {typeof booking.cost === 'number' && booking.cost > 0 && (
          <span className="text-[11px] font-bold tabular-nums text-foreground">QAR {booking.cost.toFixed(0)}</span>
        )}
      </div>
    </button>
  );
}

export function JobBoard({ bookings, isLoading, view = 'stages' }: { bookings: WithId<Booking>[] | null | undefined; isLoading: boolean; view?: 'stages' | 'matrix' }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <Skeleton key={col.status} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  const byStatus = (status: BookingStatus) =>
    (bookings ?? [])
      .filter((b) => b.status === status)
      .sort((a, b) => (bookingScheduleDate(a.bookingDate)?.getTime() ?? Infinity) - (bookingScheduleDate(b.bookingDate)?.getTime() ?? Infinity));

  const totalInFlight = COLUMNS.reduce((sum, col) => sum + byStatus(col.status).length, 0);

  if (totalInFlight === 0) {
    return (
      <EmptyState
        icon={<Clock3 className="h-8 w-8" />}
        title="No jobs in flight"
        description="Accepted and in-progress bookings will show up here as a live board."
      />
    );
  }

  if (view === 'matrix') {
    const jobs = COLUMNS.flatMap((column) => byStatus(column.status));
    return <div className="vendor-matrix">
      {jobs.slice(0, 6).map((booking) => <div key={booking.id} className="overflow-hidden rounded-xl border border-border bg-muted/40">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <span className="vendor-eyebrow text-muted-foreground">#{booking.id.slice(-8)}</span>
          <Badge variant="outline" className={booking.status === 'ReadyForPickup' ? 'vendor-gold' : 'text-primary'}>{COLUMNS.find((column) => column.status === booking.status)?.label}</Badge>
        </div>
        <JobCardTile booking={booking} />
      </div>)}
      {jobs.length > 6 && <p className="col-span-full text-xs text-muted-foreground">Showing 6 of {jobs.length} open work orders. Open All work orders for the full board.</p>}
    </div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const items = byStatus(col.status);
        return (
          <div key={col.status} className={`flex min-w-0 flex-col rounded-2xl border p-3 ${col.accent}`}>
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-foreground/80">{col.label}</p>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-[10px] font-bold text-foreground/70">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/50 px-3 py-6 text-center text-xs text-muted-foreground">
                  Nothing here
                </p>
              ) : (
                items.map((booking) => <JobCardTile key={booking.id} booking={booking} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
