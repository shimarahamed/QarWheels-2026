'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { MaterialIcon } from '@/components/ui/material-icon';
import { AIBusinessInsights } from '@/components/vendor/ai-business-insights';
import { JobBoard } from '@/components/vendor/jobs/job-board';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard, StatCardGrid } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendor } from '@/components/vendor/vendor-provider';
import { useStaffRoster } from '@/hooks/use-staff-roster';
import { useBranchWorkOrders } from '@/hooks/use-branch-work-orders';
import type { Booking } from '@/lib/types';

const ACTIVE: Booking['status'][] = ['Confirmed', 'VehicleReceived', 'InProgress', 'ReadyForPickup'];
function bookingDate(value: Booking['bookingDate']) {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

export default function VendorDashboard() {
  const { business, activeBranch, canAccess } = useVendor();
  const { data: bookings, isLoading, error, canRead } = useBranchWorkOrders();
  const { data: roster, isLoading: rosterLoading } = useStaffRoster(canAccess('staff') ? business.id : undefined);
  const technicians = (roster ?? []).filter((staff) => staff.status === 'Active' && (staff.role === 'vendor_staff' || staff.role === 'vendor_manager') && (!(staff.branchIds ?? []).length || (activeBranch && staff.branchIds?.includes(activeBranch.id))));
  const active = (bookings ?? []).filter((booking) => ACTIVE.includes(booking.status));
  const pending = (bookings ?? []).filter((booking) => booking.status === 'Pending');
  const completed = (bookings ?? []).filter((booking) => booking.status === 'Completed');
  const unavailable = isLoading || !!error || !canRead || !activeBranch || !bookings;
  const completedValue = completed.some((booking) => typeof booking.cost !== 'number' || !Number.isFinite(booking.cost) || booking.cost < 0)
    ? 'Unavailable' : `QAR ${completed.reduce((sum, booking) => sum + (booking.cost ?? 0), 0).toLocaleString()}`;
  const customers = useMemo(() => {
    if ((bookings ?? []).some((booking) => !booking.userId)) return 'Unavailable';
    return new Set((bookings ?? []).map((booking) => booking.userId)).size;
  }, [bookings]);
  const today = new Date().toDateString();
  const todayBookings = (bookings ?? []).filter((booking) => bookingDate(booking.bookingDate).toDateString() === today && !['Cancelled', 'Declined', 'NoShow'].includes(booking.status));
  const metrics = [
    { label: 'Completed booking value', value: completedValue, icon: 'payments', hint: 'Recorded costs, not collected payments' },
    { label: 'Completed jobs', value: completed.length, icon: 'build_circle', hint: 'Selected branch' },
    { label: 'Customers', value: customers, icon: 'group', hint: 'Distinct customer accounts' },
    { label: 'Reviews', value: activeBranch?.reviewCount ?? 'Unavailable', icon: 'star', hint: 'Selected branch' },
  ];

  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
    <header className="vendor-command vendor-panel flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
      <div className="min-w-0 flex-1 basis-72">
        <p className="vendor-eyebrow mb-2 text-primary">Workshop command portal</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{business.displayName || 'Your workshop'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Jobs, people and parts. One connected workspace for {activeBranch?.name || 'your selected branch'}.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canAccess('bookings') && <Button asChild><Link href="/vendor/dashboard/bookings"><MaterialIcon name="add_circle" className="mr-2 text-lg" />Manage bookings</Link></Button>}
        {canAccess('services') && <Button asChild variant="outline"><Link href="/vendor/dashboard/services">Services & rates</Link></Button>}
      </div>
    </header>

    <div className="flex flex-wrap gap-2" aria-label="Workshop status">
      <Badge variant="outline" className="px-3 py-2">Approval: {activeBranch?.status || 'Unavailable'}</Badge>
      <Badge variant="outline" className="px-3 py-2">Open jobs: {unavailable ? '--' : active.length + pending.length}</Badge>
      <Badge variant="outline" className="vendor-gold px-3 py-2">Today: {unavailable ? '--' : todayBookings.length}</Badge>
      {canAccess('bookings') && <Link href="/vendor/dashboard/requests" className="ml-auto self-center text-sm font-semibold text-primary">{unavailable ? 'View requests' : `${pending.length} pending requests`}</Link>}
    </div>

    <StatCardGrid>{isLoading ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />) : metrics.map((metric) => <StatCard key={metric.label} label={metric.label} value={unavailable ? '--' : metric.value} icon={<MaterialIcon name={metric.icon} className="text-lg" />} accent={metric.icon === 'star' ? 'bg-amber-500/10 vendor-gold' : 'bg-primary/10 text-primary'} hint={metric.hint} />)}</StatCardGrid>

    <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-w-0 shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div><p className="vendor-eyebrow mb-1 text-muted-foreground">Live work orders</p><CardTitle className="text-xl">Interactive workstation matrix</CardTitle><p className="mt-1 text-xs text-muted-foreground">Actual job stages and assignments. Each card opens its work order.</p></div>
          {canRead && <Button asChild variant="outline" size="sm"><Link href="/vendor/dashboard/jobs">All work orders</Link></Button>}
        </CardHeader>
        <CardContent>{error ? <p role="alert" className="py-8 text-sm text-destructive">Work orders could not be loaded. Refresh to retry.</p> : !canRead ? <p className="py-8 text-sm text-muted-foreground">Your role does not include work orders.</p> : !activeBranch ? <p className="py-8 text-sm text-muted-foreground">Select a branch to view its work orders.</p> : <JobBoard bookings={bookings} isLoading={isLoading} view="matrix" />}</CardContent>
      </Card>
      <div className="flex min-w-0 flex-col gap-4">
        {canAccess('staff') && <Card className="shadow-none"><CardHeader><p className="vendor-eyebrow text-muted-foreground">Team operations</p><CardTitle className="text-lg">Active roster</CardTitle></CardHeader><CardContent className="space-y-3">
          {rosterLoading ? <p className="text-sm text-muted-foreground">Loading roster…</p> : !roster ? <p className="text-sm text-muted-foreground">Roster unavailable.</p> : technicians.length === 0 ? <p className="text-sm text-muted-foreground">No active technicians available.</p> : technicians.slice(0, 5).map((tech) => <div key={tech.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3"><span className="min-w-0 truncate text-sm font-medium">{tech.displayName}</span><Badge variant="outline" className="vendor-gold shrink-0">{unavailable ? '--' : active.filter((job) => job.assignedStaffId === tech.id).length} jobs</Badge></div>)}
          <Button asChild variant="outline" className="w-full"><Link href="/vendor/dashboard/technicians">Open technician board</Link></Button>
        </CardContent></Card>}
        <Card className="shadow-none"><CardHeader><p className="vendor-eyebrow text-muted-foreground">Operations desk</p><CardTitle className="text-lg">Workspace</CardTitle></CardHeader><CardContent className="grid gap-2">
          {canAccess('bookings') && <Button asChild variant="outline" className="justify-start"><Link href="/vendor/dashboard/calendar"><MaterialIcon name="calendar_month" className="mr-2" />Bookings & schedule</Link></Button>}
          {canAccess('inventory') && <Button asChild variant="outline" className="justify-start"><Link href="/vendor/dashboard/inventory"><MaterialIcon name="inventory_2" className="mr-2" />Inventory & spare parts</Link></Button>}
          {canAccess('services') && <Button asChild variant="outline" className="justify-start"><Link href="/vendor/dashboard/services"><MaterialIcon name="build" className="mr-2" />Service catalog & rates</Link></Button>}
        </CardContent></Card>
      </div>
    </section>
    {canRead && bookings && !unavailable && <AIBusinessInsights business={business} bookings={bookings} />}
    <OnboardingChecklist title="Vendor setup" items={[
      { label: 'Complete workshop settings', href: '/vendor/dashboard/settings', done: !!activeBranch?.address },
      ...(canAccess('services') ? [{ label: 'Add services and pricing', href: '/vendor/dashboard/services' }] : []),
      ...(canAccess('inventory') ? [{ label: 'Add stock items', href: '/vendor/dashboard/inventory' }] : []),
      ...(canRead ? [{ label: 'Review booking pipeline', href: '/vendor/dashboard/bookings', done: !!bookings?.length }] : []),
    ]} />
  </div>;
}
