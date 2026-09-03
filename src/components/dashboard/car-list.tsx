'use client';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, limit as queryLimit, query, Timestamp, where } from "firebase/firestore";
import type { Booking, Car, ServiceRecord, WithId } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarClock,
  Car as CarIcon,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  History,
  IdCard,
  Palette,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { format, formatDistanceToNow, isValid } from "date-fns";

type CarListVariant = "compact" | "detailed";

type CarMetrics = {
  completedServices: number;
  totalSpent: number;
  upcomingBookings: number;
  lastService?: WithId<ServiceRecord>;
  nextBooking?: WithId<Booking>;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }
  return null;
}

function formatShortDate(value: unknown) {
  const date = toDate(value);
  return date ? format(date, "MMM d, yyyy") : "Not set";
}

function getCarImage(car: WithId<Car>) {
  return (
    (car.imageId ? PlaceHolderImages.find((img) => img.id === car.imageId) : undefined) ||
    PlaceHolderImages.find((img) =>
      car.make.toLowerCase().includes(img.imageHint.split(" ")[1] || "")
    ) ||
    PlaceHolderImages[1]
  );
}

function buildMetrics(
  car: WithId<Car>,
  serviceHistory?: WithId<ServiceRecord>[] | null,
  bookings?: WithId<Booking>[] | null
): CarMetrics {
  const carServices = (serviceHistory || []).filter((record) => record.carId === car.id);
  const sortedServices = [...carServices].sort((a, b) => {
    return (toDate(b.serviceDate)?.getTime() || 0) - (toDate(a.serviceDate)?.getTime() || 0);
  });

  const now = Date.now();
  const carBookings = (bookings || []).filter((booking) => booking.carId === car.id);
  const upcoming = carBookings
    .filter((booking) => {
      const date = toDate(booking.bookingDate);
      return booking.status === "Confirmed" && !!date && date.getTime() >= now;
    })
    .sort((a, b) => {
      return (toDate(a.bookingDate)?.getTime() || 0) - (toDate(b.bookingDate)?.getTime() || 0);
    });

  return {
    completedServices: carServices.length,
    totalSpent: carServices.reduce((sum, record) => sum + (record.cost || 0), 0),
    upcomingBookings: upcoming.length,
    lastService: sortedServices[0],
    nextBooking: upcoming[0],
  };
}

function FleetSummary({
  cars,
  serviceHistory,
  bookings,
  isLoading,
}: {
  cars?: WithId<Car>[] | null;
  serviceHistory?: WithId<ServiceRecord>[] | null;
  bookings?: WithId<Booking>[] | null;
  isLoading: boolean;
}) {
  const totalMileage = cars?.reduce((sum, car) => sum + (car.currentMileage || 0), 0) || 0;
  const totalSpent = serviceHistory?.reduce((sum, record) => sum + (record.cost || 0), 0) || 0;
  const confirmedBookings =
    bookings?.filter((booking) => booking.status === "Confirmed" && (toDate(booking.bookingDate)?.getTime() || 0) >= Date.now()).length || 0;

  const loadingValue = <Skeleton className="h-8 w-24" />;

  return (
    <StatCardGrid>
      <StatCard
        label="Vehicles"
        value={isLoading ? loadingValue : cars?.length || 0}
        icon={<CarIcon className="h-4 w-4" />}
      />
      <StatCard
        label="Fleet Mileage"
        value={isLoading ? loadingValue : `${totalMileage.toLocaleString()} km`}
        icon={<Gauge className="h-4 w-4" />}
        accent="bg-violet-500/10 text-violet-600"
      />
      <StatCard
        label="Service Spend"
        value={isLoading ? loadingValue : `QAR ${totalSpent.toLocaleString()}`}
        icon={<CircleDollarSign className="h-4 w-4" />}
        accent="bg-emerald-500/10 text-emerald-600"
      />
      <StatCard
        label="Upcoming"
        value={isLoading ? loadingValue : confirmedBookings}
        icon={<CalendarClock className="h-4 w-4" />}
        accent="bg-amber-500/10 text-amber-600"
      />
    </StatCardGrid>
  );
}

function CarCardSkeleton({ variant = "compact" }: { variant?: CarListVariant }) {
  if (variant === "detailed") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <div className="space-y-4">
            <div className="flex justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden h-full">
      <Skeleton className="w-full aspect-video" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}

function CompactCarGrid({ cars }: { cars: WithId<Car>[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => {
        const image = getCarImage(car);
        return (
          <Link href={`/dashboard/my-cars/${car.id}`} key={car.id} className="block h-full group">
            <Card className="bento-card h-full">
              <CardHeader className="p-0">
                {image && (
                  <div className="overflow-hidden">
                    <Image
                      src={car.imageUrl || image.imageUrl}
                      alt={car.make + " " + car.model}
                      width={300}
                      height={200}
                      className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={image.imageHint}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg">{car.year} {car.make} {car.model}</CardTitle>
                <p className="text-sm text-muted-foreground font-mono">{car.vin}</p>
                <p className="text-sm mt-2"><strong>Mileage:</strong> {car.currentMileage.toLocaleString()} km</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function DetailMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-background/70 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <span className="rounded-md bg-primary/10 p-1.5 text-primary">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <p className="truncate text-sm font-bold sm:text-base">{value}</p>
    </div>
  );
}

function DetailedCarRow({
  car,
  metrics,
}: {
  car: WithId<Car>;
  metrics: CarMetrics;
}) {
  const image = getCarImage(car);
  const lastServiceDate = metrics.lastService ? toDate(metrics.lastService.serviceDate) : null;
  const nextBookingDate = metrics.nextBooking ? toDate(metrics.nextBooking.bookingDate) : null;
  const lastMileageUpdate = toDate(car.lastMileageUpdateDate);

  return (
    <Card className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[280px_1fr]">
        <div className="relative min-h-[220px] overflow-hidden bg-muted lg:min-h-full">
          {image && (
            <Image
              src={car.imageUrl || image.imageUrl}
              alt={`${car.year} ${car.make} ${car.model}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 280px"
              data-ai-hint={image.imageHint}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-4 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                {car.engineType || "Gasoline"}
              </Badge>
              {car.color && (
                <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                  {car.color}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                  {car.year} {car.make} {car.model}
                </h3>
                {car.licensePlate && (
                  <Badge variant="outline" className="h-7 bg-primary/5 text-primary">
                    {car.licensePlate}
                  </Badge>
                )}
              </div>
              <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <div className="flex min-w-0 items-center gap-2">
                  <IdCard className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-mono">{car.vin}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">Added {formatShortDate(car.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/my-cars/${car.id}/add-record`}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Record
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href={`/dashboard/my-cars/${car.id}`}>
                  Details
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailMetric
              label="Odometer"
              value={`${car.currentMileage.toLocaleString()} km`}
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
            <DetailMetric
              label="Services"
              value={`${metrics.completedServices} logged`}
              icon={<History className="h-3.5 w-3.5" />}
            />
            <DetailMetric
              label="Total Spend"
              value={`QAR ${metrics.totalSpent.toLocaleString()}`}
              icon={<CircleDollarSign className="h-3.5 w-3.5" />}
            />
            <DetailMetric
              label="Upcoming"
              value={`${metrics.upcomingBookings} booking${metrics.upcomingBookings === 1 ? "" : "s"}`}
              icon={<CalendarClock className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid gap-3 border-t pt-4 md:grid-cols-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Last service
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {metrics.lastService?.serviceType || "No service logged"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lastServiceDate ? `${format(lastServiceDate, "MMM d, yyyy")} at ${metrics.lastService?.mileageAtService.toLocaleString()} km` : "Start the digital passport"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Next booking
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {metrics.nextBooking?.serviceName || "Nothing scheduled"}
              </p>
              <p className="text-xs text-muted-foreground">
                {nextBookingDate ? `${format(nextBookingDate, "MMM d, yyyy")} with ${metrics.nextBooking?.branchName}` : "Ready when you are"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Vehicle profile
              </p>
              <p className="mt-1 flex items-center gap-2 truncate text-sm font-semibold">
                <Palette className="h-4 w-4 shrink-0 text-primary" />
                {car.color || "Color not specified"}
              </p>
              <p className="text-xs text-muted-foreground">
                Mileage updated {lastMileageUpdate ? formatDistanceToNow(lastMileageUpdate, { addSuffix: true }) : "date not set"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CarList({ variant = "compact" }: { variant?: CarListVariant }) {
  const { firestore, user } = useFirebase();

  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading } = useCollection<WithId<Car>>(carsCollection);

  const serviceRecordsQuery = useMemoFirebase(
    () => (user && variant === "detailed" ? query(collectionGroup(firestore, "serviceRecords"), where("userId", "==", user.uid), queryLimit(100)) : null),
    [firestore, user, variant]
  );
  const { data: serviceHistory, isLoading: isLoadingHistory } = useCollection<WithId<ServiceRecord>>(serviceRecordsQuery);

  const bookingsQuery = useMemoFirebase(
    () => (user && variant === "detailed" ? query(collection(firestore, "bookings"), where("userId", "==", user.uid), queryLimit(50)) : null),
    [firestore, user, variant]
  );
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

  const isLoadingDetails = isLoading || (variant === "detailed" && (isLoadingHistory || isLoadingBookings));
  
  if (isLoading) {
    return (
      <div className={variant === "detailed" ? "space-y-4" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
        {variant === "detailed" && <FleetSummary isLoading />}
        {[...Array(3)].map((_, i) => <CarCardSkeleton key={i} variant={variant} />)}
      </div>
    )
  }

  if (!cars || cars.length === 0) {
    return (
        <EmptyState
            icon={<CarIcon className="h-8 w-8" />}
            title="No Cars Added"
            description="You haven't added any cars to your profile yet."
            action={
                <Button asChild>
                    <Link href="/dashboard/my-cars/add">Add Your First Car</Link>
                </Button>
            }
        />
    )
  }

  if (variant === "detailed") {
    return (
      <div className="space-y-4">
        <FleetSummary cars={cars} serviceHistory={serviceHistory} bookings={bookings} isLoading={isLoadingDetails} />
        <div className="space-y-4">
          {cars.map((car) => (
            <DetailedCarRow key={car.id} car={car} metrics={buildMetrics(car, serviceHistory, bookings)} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <CompactCarGrid cars={cars} />
  );
}
