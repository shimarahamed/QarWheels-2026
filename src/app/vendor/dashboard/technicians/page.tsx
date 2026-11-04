'use client';

import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Car, ClipboardCheck, UserCog, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useVendor } from '@/components/vendor/vendor-provider';
import { useStaffRoster } from '@/hooks/use-staff-roster';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import type { Booking, WithId } from '@/lib/types';
import { useRouter } from 'next/navigation';

function toDate(value: Booking['bookingDate']) {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

const IN_FLIGHT_STATUSES: Booking['status'][] = ['Confirmed', 'VehicleReceived', 'InProgress', 'ReadyForPickup'];

/**
 * Who's working on what, right now. Reads straight off `assignedStaffId` on
 * in-flight bookings — there's no separate "technician" entity, a technician
 * is just a membership someone has assigned jobs to, so this is a view over
 * existing data rather than a new collection.
 */
export default function TechniciansBoardPage() {
  const { firestore } = useFirebase();
  const { business, activeBranch, canSeeAllBranches } = useVendor();
  const router = useRouter();

  const { data: roster, isLoading: isLoadingStaff } = useStaffRoster(business.id);
  const staff = roster?.filter((s) => s.status === 'Active');

  const bookingsQuery = useMemoFirebase(
    () =>
      canSeeAllBranches
        ? query(collection(firestore, 'bookings'), where('businessId', '==', business.id))
        : activeBranch
          ? query(collection(firestore, 'bookings'), where('branchId', '==', activeBranch.id))
          : null,
    [firestore, business, activeBranch, canSeeAllBranches],
  );
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

  const isLoading = isLoadingStaff || isLoadingBookings;
  const inFlight = (bookings ?? []).filter((b) => IN_FLIGHT_STATUSES.includes(b.status));
  // Only technician-facing roles show up as lanes — owners/admins/cashiers
  // don't work the floor, so a lane for them would always read "idle".
  const technicians = (staff ?? []).filter((s) => s.role === 'vendor_staff' || s.role === 'vendor_manager');

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHeader
        eyebrow="Technician board"
        icon={<Users className="h-3.5 w-3.5" />}
        title="Who's on what, right now."
        description="A live view of assigned jobs per technician, so handing off work is a glance, not a search."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : technicians.length === 0 ? (
        <EmptyState
          icon={<UserCog className="h-8 w-8" />}
          title="No technicians on the team yet"
          description="Invite staff with a Staff or Manager role to see them here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => {
            const jobs = inFlight
              .filter((b) => b.assignedStaffId === tech.id)
              .sort((a, b) => toDate(a.bookingDate).getTime() - toDate(b.bookingDate).getTime());

            return (
              <Card key={tech.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 border-b pb-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/15">
                      <AvatarFallback className="bg-primary/10 font-bold text-primary">{initials(tech.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{tech.displayName}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[tech.role]}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={jobs.length > 0 ? 'border-primary/30 bg-primary/8 text-primary' : 'border-emerald-500/30 bg-emerald-500/8 text-emerald-600'}
                    >
                      {jobs.length > 0 ? `${jobs.length} active` : 'Idle'}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {jobs.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border/50 px-3 py-5 text-center text-xs text-muted-foreground">
                        No jobs assigned
                      </p>
                    ) : (
                      jobs.map((job) => (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => router.push(`/vendor/dashboard/jobs/${job.id}`)}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-background"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{job.serviceName}</p>
                            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                              <Car className="h-3 w-3 shrink-0" />
                              {job.carDescription ?? 'Vehicle details unavailable'}
                            </p>
                          </div>
                          <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
