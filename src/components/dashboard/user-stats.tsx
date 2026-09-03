'use client';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, where } from "firebase/firestore";
import type { Car, Booking, ServiceRecord, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Car as CarIcon, Calendar, History, CircleDollarSign } from "lucide-react";

export function UserStats() {
  const { firestore, user } = useFirebase();

  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<Car>>(carsCollection);

  const bookingsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'bookings'), where('userId', '==', user.uid), where('status', '==', 'Confirmed')) : null),
    [firestore, user]
  );
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

  const serviceRecordsQuery = useMemoFirebase(
    () => (user ? query(collectionGroup(firestore, 'serviceRecords'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: serviceHistory, isLoading: isLoadingHistory } = useCollection<WithId<ServiceRecord>>(serviceRecordsQuery);

  const isLoading = isLoadingCars || isLoadingBookings || isLoadingHistory;
  const totalSpent = serviceHistory?.reduce((acc, record) => acc + record.cost, 0) || 0;

  const loadingValue = <Skeleton className="h-8 w-24" />;

  return (
    <StatCardGrid>
      <StatCard
        label="Total Cars"
        value={isLoadingCars ? loadingValue : cars?.length || 0}
        icon={<CarIcon className="h-4 w-4" />}
        hint="Updated live"
      />
      <StatCard
        label="Upcoming Appointments"
        value={isLoadingBookings ? loadingValue : bookings?.length || 0}
        icon={<Calendar className="h-4 w-4" />}
        accent="bg-violet-500/10 text-violet-600"
        hint="Updated live"
      />
      <StatCard
        label="Services Logged"
        value={isLoadingHistory ? loadingValue : serviceHistory?.length || 0}
        icon={<History className="h-4 w-4" />}
        accent="bg-emerald-500/10 text-emerald-600"
        hint="Updated live"
      />
      <StatCard
        label="Total Spent"
        value={isLoading ? loadingValue : `QAR ${totalSpent.toFixed(0)}`}
        icon={<CircleDollarSign className="h-4 w-4" />}
        accent="bg-amber-500/10 text-amber-600"
        hint="Updated live"
      />
    </StatCardGrid>
  );
}
