'use client';

import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useVendor } from '@/components/vendor/vendor-provider';
import type { Booking } from '@/lib/types';

export function useBranchWorkOrders() {
  const { firestore } = useFirebase();
  const { business, activeBranch, canAccess } = useVendor();
  const canRead = canAccess('bookings');
  const bookingsQuery = useMemoFirebase(
    () => canRead && activeBranch
      ? query(collection(firestore, 'bookings'), where('businessId', '==', business.id), where('branchId', '==', activeBranch.id))
      : null,
    [firestore, business.id, activeBranch, canRead],
  );
  const result = useCollection<Booking>(bookingsQuery);
  const staleData = result.data?.some((booking) => booking.businessId !== business.id || booking.branchId !== activeBranch?.id);
  return {
    ...result,
    data: canRead && activeBranch && !staleData ? result.data : null,
    isLoading: canRead && !!activeBranch && (result.isLoading || !!staleData),
    activeBranch,
    canRead,
  };
}
