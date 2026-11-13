'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchWorkOrders } from '@/hooks/use-branch-work-orders';
import { bookingScheduleDate, bookingsOnScheduleDay, scheduleDays } from '@/lib/vendor-schedule';
import type { Booking, WithId } from '@/lib/types';

type ScheduleView = 'day' | 'week' | 'list';
const VIEWS: { value: ScheduleView; label: string }[] = [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'list', label: 'Week list' }];

function ScheduleJob({ booking }: { booking: WithId<Booking> }) {
  const date = bookingScheduleDate(booking.bookingDate)!;
  return (
    <Link href={`/vendor/dashboard/jobs/${encodeURIComponent(booking.id)}`} className="block rounded-xl border border-border/70 bg-background/70 p-3 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <time dateTime={date.toISOString()} className="font-mono text-xs font-semibold text-primary">{format(date, 'h:mm a')}</time>
        <StatusBadge status={booking.status} className="text-[10px]" />
      </div>
      <h3 className="break-words text-sm font-semibold">{booking.serviceName}</h3>
      <p className="mt-1 break-words text-xs text-muted-foreground">{booking.customerName || 'Customer'} · {booking.carDescription || 'Vehicle details unavailable'}</p>
      <p className="mt-3 flex items-start gap-1.5 border-t pt-2 text-xs text-muted-foreground"><UserCog aria-hidden className="h-3.5 w-3.5 shrink-0" />{booking.assignedStaffName || 'Unassigned'}</p>
    </Link>
  );
}

export default function VendorCalendarPage() {
  const { data: bookings, isLoading, error, activeBranch, canRead } = useBranchWorkOrders();
  const [dateKey, setDateKey] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [view, setView] = useState<ScheduleView>('week');
  const days = scheduleDays(dateKey, view === 'day' ? 1 : 7);
  const scheduledDays = days.map((day) => ({ day, jobs: bookingsOnScheduleDay(bookings ?? [], day) }));
  const jobsInRange = scheduledDays.flatMap(({ jobs }) => jobs);
  const undatedCount = (bookings ?? []).filter((booking) => !bookingScheduleDate(booking.bookingDate)).length;
  const shiftDate = (direction: -1 | 1) => setDateKey(format(addDays(parseISO(dateKey), direction * (view === 'day' ? 1 : 7)), 'yyyy-MM-dd'));
  const unavailable = isLoading || error || !activeBranch;

  if (!canRead) return <EmptyState title="Schedule unavailable" description="Your role does not have access to bookings." />;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      <PageHeader
        eyebrow="Workshop operations"
        icon={<CalendarDays className="h-4 w-4" />}
        title="Bookings & Schedule Matrix"
        description="Review preferred booking times and technician assignments. These times are customer preferences, not reserved bays or confirmed service durations."
        action={<Button variant="outline" asChild><Link href="/vendor/dashboard/jobs">Work orders</Link></Button>}
      />
      <section aria-label="Schedule controls" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0"><label htmlFor="schedule-date" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Starting date</label><Input id="schedule-date" type="date" value={dateKey} onChange={(event) => { if (event.target.value) setDateKey(event.target.value); }} className="w-40" /></div>
          <Button variant="outline" size="icon" aria-label="Previous period" onClick={() => shiftDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" aria-label="Next period" onClick={() => shiftDate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setDateKey(format(new Date(), 'yyyy-MM-dd'))}>Today</Button>
        </div>
        <div role="group" aria-label="Schedule view" className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {VIEWS.map(({ value, label }) => <Button key={value} variant={view === value ? 'default' : 'ghost'} aria-pressed={view === value} onClick={() => setView(value)}>{label}</Button>)}
        </div>
      </section>
      <StatCardGrid>
        <StatCard label="Bookings in period" value={unavailable ? '—' : jobsInRange.length} hint="All booking statuses" />
        <StatCard label="Awaiting acceptance" value={unavailable ? '—' : jobsInRange.filter((job) => job.status === 'Pending').length} hint="Pending requests in this period" />
        <StatCard label="In progress" value={unavailable ? '—' : jobsInRange.filter((job) => job.status === 'InProgress').length} hint="Work currently underway" />
        <StatCard label="Ready for pickup" value={unavailable ? '—' : jobsInRange.filter((job) => job.status === 'ReadyForPickup').length} hint="Ready jobs in this period" />
      </StatCardGrid>
      <section aria-label="Preferred booking schedule" className="rounded-2xl border bg-card p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
          <h2 className="text-lg font-bold">{activeBranch?.name || 'Branch schedule'}</h2>
          <p className="text-xs text-muted-foreground">Times shown in your device timezone.</p>
        </div>
        {!activeBranch ? <EmptyState title="Select a branch" description="Choose a workshop branch to view its schedule." />
          : error ? <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm">The schedule could not be loaded. Check your connection and refresh to try again.</p>
            : isLoading ? <div aria-label="Loading schedule" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-48 rounded-xl" />)}</div>
              : <>
                {undatedCount > 0 && <p role="status" className="mb-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">{undatedCount} booking{undatedCount === 1 ? ' has' : 's have'} no valid preferred date. <Link href="/vendor/dashboard/bookings" className="underline">Review all bookings</Link>.</p>}
                <div className={view === 'week' ? 'grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-4'}>
                  {scheduledDays.map(({ day, jobs }) => <section key={day.toISOString()} className="min-w-0 rounded-xl border bg-background/40 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3"><h3 className="text-sm font-bold">{format(day, 'EEE, MMM d')}</h3><span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{jobs.length}</span></div>
                    <div className={view === 'week' ? 'space-y-2' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'}>{jobs.length ? jobs.map((booking) => <ScheduleJob key={booking.id} booking={booking} />) : <p className="py-5 text-xs text-muted-foreground">No bookings for this day.</p>}</div>
                  </section>)}
                </div>
              </>}
      </section>
    </div>
  );
}
