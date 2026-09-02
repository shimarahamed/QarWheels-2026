'use client';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, where } from "firebase/firestore";
import type { Car, Booking, ServiceRecord, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Car as CarIcon, Calendar, History, CircleDollarSign, TrendingUp } from "lucide-react";

interface StatDef {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  glow: string;
  accentLine: string;
  isLoading: boolean;
}

function StatCard({ title, value, icon: Icon, iconBg, iconColor, glow, accentLine, isLoading }: StatDef) {
  return (
    <div className={`group bento-card p-5 ${glow}`}>
      {/* Gradient top accent line revealed on hover */}
      <div className={`card-accent-top ${accentLine}`} />

      {/* Ambient glow blob */}
      <div className={`ambient-blob -right-6 -top-6 h-20 w-20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${iconBg}`} />

      <div className="relative flex items-start justify-between gap-3">
        <p className="section-label">{title}</p>
        <div className={`icon-pill h-10 w-10 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>

      <div className="relative mt-4">
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p className="metric-number">{value}</p>
        )}
      </div>

      <div className="relative mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <TrendingUp className={`h-3.5 w-3.5 ${iconColor}`} />
        <span>Updated live</span>
      </div>
    </div>
  );
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

  const stats: StatDef[] = [
    {
      title: "Total Cars",
      value: cars?.length || 0,
      icon: CarIcon,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      glow: "hover:bg-primary/[0.02]",
      accentLine: "from-primary via-sky-400 to-transparent",
      isLoading: isLoadingCars,
    },
    {
      title: "Upcoming Appointments",
      value: bookings?.length || 0,
      icon: Calendar,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
      glow: "hover:bg-violet-500/[0.02]",
      accentLine: "from-violet-500 via-purple-400 to-transparent",
      isLoading: isLoadingBookings,
    },
    {
      title: "Services Logged",
      value: serviceHistory?.length || 0,
      icon: History,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      glow: "hover:bg-emerald-500/[0.02]",
      accentLine: "from-emerald-500 via-teal-400 to-transparent",
      isLoading: isLoadingHistory,
    },
    {
      title: "Total Spent",
      value: `QAR ${totalSpent.toFixed(0)}`,
      icon: CircleDollarSign,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      glow: "hover:bg-amber-500/[0.02]",
      accentLine: "from-amber-500 via-orange-400 to-transparent",
      isLoading: isLoading,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
