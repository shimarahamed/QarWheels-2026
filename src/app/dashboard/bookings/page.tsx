'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format, isValid } from 'date-fns';
import { collection, limit as queryLimit, query, Timestamp, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Booking, Car as CarType, WithId } from '@/lib/types';
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Loader2,
  MapPin,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';

function toDate(value: Booking['bookingDate']) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return isValid(value) ? value : new Date();
  const date = new Date(value);
  return isValid(date) ? date : new Date();
}

function statusVariant(status: Booking['status']) {
  if (status === 'Confirmed') return 'default';
  if (status === 'Completed') return 'secondary';
  if (status === 'Cancelled') return 'destructive';
  return 'outline';
}

function BookingStats({ bookings }: { bookings: WithId<Booking>[] }) {
  const now = Date.now();
  const upcoming = bookings.filter((booking) => booking.status === 'Confirmed' && toDate(booking.bookingDate).getTime() >= now).length;
  const completed = bookings.filter((booking) => booking.status === 'Completed').length;
  const pending = bookings.filter((booking) => booking.status === 'Pending').length;
  const spend = bookings.reduce((sum, booking) => sum + (booking.cost || 0), 0);

  const stats = [
    { label: 'Upcoming', value: upcoming, icon: Calendar, tone: 'text-primary' },
    { label: 'Completed', value: completed, icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: 'Pending', value: pending, icon: Clock, tone: 'text-amber-600' },
    { label: 'Total Value', value: `QAR ${spend.toLocaleString()}`, icon: CircleDollarSign, tone: 'text-slate-700' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</p>
              <Icon className={`h-5 w-5 ${stat.tone}`} />
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function BookingCard({ booking, car }: { booking: WithId<Booking>; car?: WithId<CarType> }) {
  const bookingDate = toDate(booking.bookingDate);
  const isCancelled = booking.status === 'Cancelled';

  return (
    <Card className="overflow-hidden border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[160px_1fr_auto]">
        <div className={`flex flex-row items-center justify-between gap-3 border-b p-4 lg:flex-col lg:items-start lg:justify-center lg:border-b-0 lg:border-r ${isCancelled ? 'bg-destructive/5' : 'bg-primary/5'}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{format(bookingDate, 'MMM')}</p>
            <p className="text-4xl font-bold leading-none">{format(bookingDate, 'd')}</p>
          </div>
          <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">{booking.serviceName}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{booking.branchName}</span>
              </p>
            </div>
            {booking.cost ? (
              <Badge variant="outline" className="h-7 bg-background">QAR {booking.cost.toLocaleString()}</Badge>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Vehicle</p>
              <p className="mt-1 truncate text-sm font-bold">
                {car ? `${car.year} ${car.make} ${car.model}` : 'Vehicle assigned'}
              </p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Schedule</p>
              <p className="mt-1 truncate text-sm font-bold">{format(bookingDate, 'PPP, p')}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Notes</p>
              <p className="mt-1 truncate text-sm font-bold">{booking.notes || 'No notes added'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center border-t p-4 lg:border-l lg:border-t-0">
          <Button asChild variant="outline" className="w-full justify-between lg:w-36">
            <Link href={`/dashboard/bookings/${booking.id}`}>
              Details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingList({
  bookings,
  cars,
  isLoading,
}: {
  bookings: WithId<Booking>[];
  cars: WithId<CarType>[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-24 w-28" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <Wrench className="mx-auto mb-4 h-12 w-12 text-primary/50" />
          <p className="font-semibold text-foreground">No bookings found</p>
          <p className="mt-1 text-sm">Book a garage visit to start building your service timeline.</p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/garages">Find a Garage</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} car={cars.find((c) => c.id === booking.carId)} />
      ))}
    </div>
  );
}

export default function BookingsPage() {
  const { firestore, user } = useFirebase();
  const [vehicleFilter, setVehicleFilter] = useState('all');

  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: carsData } = useCollection<WithId<CarType>>(carsCollection);
  const cars = carsData || [];

  const bookingsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'bookings'), where('userId', '==', user.uid), queryLimit(100)) : null),
    [firestore, user]
  );
  const { data: bookingsData, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);
  const bookings = bookingsData || [];

  const sortedBookings = useMemo(() => {
    return [...bookings]
      .filter((booking) => vehicleFilter === 'all' || booking.carId === vehicleFilter)
      .sort((a, b) => toDate(a.bookingDate).getTime() - toDate(b.bookingDate).getTime());
  }, [bookings, vehicleFilter]);

  const now = Date.now();
  const upcomingBookings = sortedBookings.filter((booking) => booking.status === 'Confirmed' && toDate(booking.bookingDate).getTime() >= now);
  const pendingBookings = sortedBookings.filter((booking) => booking.status === 'Pending');
  const pastBookings = sortedBookings
    .filter((booking) => !upcomingBookings.some((item) => item.id === booking.id) && booking.status !== 'Pending')
    .sort((a, b) => toDate(b.bookingDate).getTime() - toDate(a.bookingDate).getTime());

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 h-8 gap-2 bg-primary/5 px-3 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Booking planner
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Appointments that read like a timeline.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Follow upcoming visits, pending requests, completed work, and cancelled appointments across every vehicle.
            </p>
          </div>
          <Button asChild className="justify-start">
            <Link href="/dashboard/garages">
              <CalendarPlus className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
        </div>
      </header>

      {isLoadingBookings ? (
        <div className="flex h-28 items-center justify-center rounded-2xl border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <BookingStats bookings={bookings} />
      )}

      <section className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Car className="h-4 w-4 text-primary" />
            Vehicle filter
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="h-10 w-full sm:w-72">
              <SelectValue placeholder="All vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {cars.map((car) => (
                <SelectItem key={car.id} value={car.id}>{car.year} {car.make} {car.model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            <BookingList bookings={upcomingBookings} cars={cars} isLoading={isLoadingBookings} />
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <BookingList bookings={pendingBookings} cars={cars} isLoading={isLoadingBookings} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <BookingList bookings={pastBookings} cars={cars} isLoading={isLoadingBookings} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
