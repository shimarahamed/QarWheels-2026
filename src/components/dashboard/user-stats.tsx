'use client';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, where } from "firebase/firestore";
import type { Car, Booking, ServiceRecord, WithId } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Car as CarIcon, Calendar, History, CircleDollarSign } from "lucide-react";

function StatCard({ title, value, icon, isLoading }: { title: string, value: string | number, icon: React.ReactNode, isLoading: boolean }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                <CardTitle className="text-[10px] sm:text-sm font-medium">{title}</CardTitle>
                <div className="text-muted-foreground scale-75 sm:scale-100">{icon}</div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                {isLoading ? <Skeleton className="h-6 w-16 sm:h-8 sm:w-24" /> : (
                    <div className="text-lg sm:text-2xl font-bold">{value}</div>
                )}
            </CardContent>
        </Card>
    )
}

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

  return (
    <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Cars" value={cars?.length || 0} icon={<CarIcon className="h-4 w-4" />} isLoading={isLoading} />
        <StatCard title="Upcoming Appointments" value={bookings?.length || 0} icon={<Calendar className="h-4 w-4" />} isLoading={isLoading} />
        <StatCard title="Services Logged" value={serviceHistory?.length || 0} icon={<History className="h-4 w-4" />} isLoading={isLoading} />
        <StatCard title="Total Spent" value={`QAR ${totalSpent.toFixed(0)}`} icon={<CircleDollarSign className="h-4 w-4" />} isLoading={isLoading} />
    </div>
  )
}
