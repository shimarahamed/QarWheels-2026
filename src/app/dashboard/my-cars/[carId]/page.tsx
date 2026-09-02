'use client';

import type { ReactNode } from "react";
import {
  Car as CarIcon,
  Calendar,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  ArrowLeft,
  History,
  Loader2,
  AlertTriangle,
  PlusCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParams } from "next/navigation";
import { CarMaintenancePredictions } from "@/components/dashboard/car-maintenance-predictions";
import { ServiceHistorySummary } from "@/components/dashboard/service-history-summary";
import { MileageUpdate } from "@/components/dashboard/mileage-update";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirebase, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, limit as queryLimit, query, Timestamp, where } from 'firebase/firestore';
import type { Booking, Car, ServiceRecord, WithId } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Skeleton } from "@/components/ui/skeleton";
import { AISymptomChecker } from "@/components/dashboard/ai-symptom-checker";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


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

function VehicleMetric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card/90 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <span className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</span>
      </div>
      <p className="truncate text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function VehicleBookingPanel({ bookings, isLoading }: { bookings?: WithId<Booking>[] | null; isLoading: boolean }) {
  const visibleBookings = [...(bookings || [])]
    .sort((a, b) => (toDate(a.bookingDate)?.getTime() || 0) - (toDate(b.bookingDate)?.getTime() || 0))
    .slice(0, 4);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Booking Pipeline</CardTitle>
          <CardDescription>Pending and upcoming work for this vehicle.</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/garages">Book Service</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-background/60 px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">No active bookings</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Book a service to connect this vehicle with a garage.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard/garages">Find Garages</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleBookings.map((booking) => {
              const date = toDate(booking.bookingDate);
              return (
                <div key={booking.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{booking.serviceName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {booking.vendorName} {date ? `- ${format(date, "MMM d, h:mm a")}` : ""}
                    </p>
                  </div>
                  <Badge variant={booking.status === "Cancelled" ? "destructive" : booking.status === "Confirmed" ? "default" : "outline"}>
                    {booking.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceHistoryList({ carId, serviceHistory, isLoading }: { carId: string, serviceHistory: WithId<ServiceRecord>[] | null, isLoading: boolean }) {
    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32"/>
                    <Skeleton className="h-4 w-48 mt-2"/>
                </CardHeader>
                <CardContent><div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent>
             </Card>
        )
    }

    return (
        <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Digital Service Passport</CardTitle>
                <CardDescription>A complete log of all maintenance performed.</CardDescription>
              </div>
              <Button asChild size="sm">
                <Link href={`/dashboard/my-cars/${carId}/add-record`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Record
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
                {!serviceHistory || serviceHistory.length === 0 ? (
                     <div className="text-center text-muted-foreground py-12 px-8 rounded-lg border border-dashed">
                        <History className="mx-auto h-12 w-12 mb-4 text-primary/30" />
                        <h3 className="font-semibold text-lg">Empty Passport</h3>
                        <p>No records found. Start your digital history today.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead className="hidden md:table-cell">Description</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...serviceHistory].sort((a,b) => (toDate(b.serviceDate)?.getTime() || 0) - (toDate(a.serviceDate)?.getTime() || 0)).map((record) => {
                                const recordDate = toDate(record.serviceDate);
                                return (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                        {recordDate ? format(recordDate, "MMM d, yyyy") : 'Invalid Date'}
                                        </TableCell>
                                        <TableCell className="font-semibold">{record.serviceType}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{record.serviceDescription}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                        QAR {record.cost.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function CarDetailsPage() {
  const params = useParams();
  const carId = params.carId as string;
  const { firestore, user, isUserLoading } = useFirebase();

  const carRef = useMemoFirebase(
    () => (user && carId ? doc(firestore, 'users', user.uid, 'cars', carId) : null),
    [firestore, user, carId]
  );
  const { data: car, isLoading: isLoadingCar, error: carError } = useDoc<WithId<Car>>(carRef);
  
  const serviceHistoryRef = useMemoFirebase(() => 
    user && carId ? collection(firestore, `users/${user.uid}/cars/${carId}/serviceRecords`) : null,
    [firestore, user, carId]
  );
  const { data: serviceHistory, isLoading: isLoadingHistory, error: historyError } = useCollection<WithId<ServiceRecord>>(serviceHistoryRef);

  const bookingsQuery = useMemoFirebase(
    () => (user && carId ? query(collection(firestore, 'bookings'), where('userId', '==', user.uid), queryLimit(100)) : null),
    [firestore, user, carId]
  );
  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useCollection<WithId<Booking>>(bookingsQuery);

  const isLoading = isUserLoading || isLoadingCar || isLoadingHistory || isLoadingBookings;
  const error = carError || historyError || bookingsError;
  
  if (isLoading) {
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (error || !car) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Could not load vehicle details.</AlertDescription></Alert>;
  }

  const image = car.imageId ? PlaceHolderImages.find((img) => img.id === car.imageId) : (PlaceHolderImages.find((img) => car.make.toLowerCase().includes(img.imageHint.split(' ')[1])) || PlaceHolderImages[1]);
  const carBookings = (bookings || []).filter((booking) => booking.carId === car.id);
  const activeBookings = carBookings.filter((booking) => booking.status === "Pending" || (booking.status === "Confirmed" && (toDate(booking.bookingDate)?.getTime() || 0) >= Date.now()));
  const totalSpend = (serviceHistory || []).reduce((sum, record) => sum + (record.cost || 0), 0);
  const lastService = [...(serviceHistory || [])].sort((a, b) => (toDate(b.serviceDate)?.getTime() || 0) - (toDate(a.serviceDate)?.getTime() || 0))[0];
  const purchaseDate = toDate(car.purchaseDate);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
       <Button variant="ghost" asChild className="-ml-4">
        <Link href="/dashboard/my-cars"><ArrowLeft className="mr-2 h-4 w-4" />Back to My Cars</Link>
      </Button>

      <header className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col justify-between gap-6 p-5 sm:p-6 lg:p-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Vehicle command center
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {car.year} {car.make} {car.model}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  <CarIcon className="mr-1 h-3.5 w-3.5" /> {car.engineType || 'Gasoline'}
                </Badge>
                {car.licensePlate && <Badge variant="outline">{car.licensePlate}</Badge>}
                {car.color && <Badge variant="outline">{car.color}</Badge>}
              </div>
              <p className="mt-3 break-all font-mono text-xs text-muted-foreground sm:text-sm">{car.vin}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <VehicleMetric label="Mileage" value={`${car.currentMileage.toLocaleString()} km`} icon={<Gauge className="h-4 w-4" />} />
              <VehicleMetric label="Records" value={(serviceHistory || []).length} icon={<History className="h-4 w-4" />} />
              <VehicleMetric label="Spend" value={`QAR ${totalSpend.toLocaleString()}`} icon={<CircleDollarSign className="h-4 w-4" />} />
              <VehicleMetric label="Active Jobs" value={activeBookings.length} icon={<CalendarClock className="h-4 w-4" />} />
            </div>
          </div>

          <div className="relative min-h-[260px] bg-muted lg:min-h-full">
            {image && (
              <Image
                src={car.imageUrl || image.imageUrl}
                alt={car.make}
                fill
                className="object-cover"
                data-ai-hint={image.imageHint}
                sizes="(max-width: 1024px) 100vw, 380px"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 text-white">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                  <p className="text-xs text-white/70">Last service</p>
                  <p className="truncate text-sm font-bold">{lastService?.serviceType || "Not logged"}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                  <p className="text-xs text-white/70">Owned since</p>
                  <p className="truncate text-sm font-bold">{purchaseDate ? format(purchaseDate, "MMM yyyy") : "Not set"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Vehicle Identity</CardTitle>
              <CardDescription>Core ownership and inspection details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-background/70 p-3">
                <CarIcon className="mb-2 h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Make / Model</p>
                <p className="truncate font-bold">{car.make} {car.model}</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3">
                <Calendar className="mb-2 h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Model year</p>
                <p className="font-bold">{car.year}</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3">
                <ShieldCheck className="mb-2 h-4 w-4 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Plate</p>
                <p className="truncate font-bold">{car.licensePlate || "Not set"}</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3">
                <Gauge className="mb-2 h-4 w-4 text-amber-600" />
                <p className="text-xs text-muted-foreground">Last update</p>
                <p className="truncate font-bold">{toDate(car.lastMileageUpdateDate) ? format(toDate(car.lastMileageUpdateDate)!, "MMM d") : "Not set"}</p>
              </div>
            </CardContent>
          </Card>
          
          <ServiceHistoryList carId={car.id} serviceHistory={serviceHistory} isLoading={isLoading} />
          <VehicleBookingPanel bookings={activeBookings} isLoading={isLoadingBookings} />
        </div>


        <div className="space-y-6">
          <AISymptomChecker car={car} />
          <MileageUpdate car={car} />
          <ServiceHistorySummary car={car} serviceHistory={serviceHistory} />
          <CarMaintenancePredictions car={car} />
        </div>

      </div>
    </div>
  );
}
