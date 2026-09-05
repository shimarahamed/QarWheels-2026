'use client';

import { collection, query, where } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Car, Inbox, Mail } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useVendor } from '@/components/vendor/vendor-provider';
import { BookingActions } from '@/components/vendor/bookings/booking-actions';
import type { Booking, WithId } from '@/lib/types';
import { useRouter } from 'next/navigation';

function toDate(value: Booking['bookingDate']) {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

/**
 * A dedicated Pending-only queue, pulled out of the bookings table's
 * "Requests" tab so accepting/declining incoming work doesn't compete with
 * browsing history. Ordered oldest-first — the request that's been waiting
 * longest surfaces first, since that's the one most likely to be timing out.
 */
export default function RequestsInboxPage() {
  const { firestore } = useFirebase();
  const { business, activeBranch, canSeeAllBranches } = useVendor();
  const router = useRouter();

  const pendingQuery = useMemoFirebase(
    () =>
      canSeeAllBranches
        ? query(collection(firestore, 'bookings'), where('businessId', '==', business.id), where('status', '==', 'Pending'))
        : activeBranch
          ? query(collection(firestore, 'bookings'), where('branchId', '==', activeBranch.id), where('status', '==', 'Pending'))
          : null,
    [firestore, business, activeBranch, canSeeAllBranches],
  );
  const { data: requests, isLoading } = useCollection<WithId<Booking>>(pendingQuery);

  const sorted = (requests ?? []).slice().sort((a, b) => toDate(a.bookingDate).getTime() - toDate(b.bookingDate).getTime());

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <PageHeader
        eyebrow="Requests inbox"
        icon={<Inbox className="h-3.5 w-3.5" />}
        title="New jobs, waiting on you."
        description="Accept or decline incoming bookings before a customer looks elsewhere. Oldest requests surface first."
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title="Inbox zero"
          description="No pending requests right now — new bookings will land here the moment a customer books."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((booking) => {
            const date = toDate(booking.bookingDate);
            return (
              <Card
                key={booking.id}
                className="cursor-pointer overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                onClick={() => router.push(`/vendor/dashboard/jobs/${booking.id}`)}
              >
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <p className="font-bold">{booking.customerName || 'Customer'}</p>
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/8 text-[11px] text-amber-600">
                        Waiting {formatDistanceToNow(date)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Car className="h-3 w-3" />{booking.carDescription ?? 'Vehicle details unavailable'}</span>
                      <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{booking.customerEmail}</span>
                      <span>{format(date, 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <BookingActions booking={booking} />
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
