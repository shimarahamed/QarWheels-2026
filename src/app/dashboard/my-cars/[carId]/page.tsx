'use client';

import {
  Car as CarIcon,
  Calendar,
  Gauge,
  ArrowLeft,
  History,
  Loader2,
  AlertTriangle,
  PlusCircle,
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
import { collection, doc } from 'firebase/firestore';
import type { Car, ServiceRecord, WithId } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


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
        <Card>
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
                            {[...serviceHistory].sort((a,b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()).map((record) => {
                                const recordDate = new Date(record.serviceDate);
                                return (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                        {isValid(recordDate) ? format(recordDate, "MMM d, yyyy") : 'Invalid Date'}
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

  const isLoading = isUserLoading || isLoadingCar || isLoadingHistory;
  const error = carError || historyError;
  
  if (isLoading) {
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (error || !car) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Could not load vehicle details.</AlertDescription></Alert>;
  }

  const image = car.imageId ? PlaceHolderImages.find((img) => img.id === car.imageId) : (PlaceHolderImages.find((img) => car.make.toLowerCase().includes(img.imageHint.split(' ')[1])) || PlaceHolderImages[1]);

  return (
    <div className="space-y-6">
       <Button variant="ghost" asChild className="-ml-4">
        <Link href="/dashboard/my-cars"><ArrowLeft className="mr-2 h-4 w-4" />Back to My Cars</Link>
      </Button>

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">{car.year} {car.make} {car.model}</h1>
            <p className="text-muted-foreground font-mono text-sm">{car.vin}</p>
        </div>
        <div className="flex gap-2">
             <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-7">
                <CarIcon className="w-3 h-3 mr-1" /> {car.engineType || 'Gasoline'}
             </Badge>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <Card className="overflow-hidden shadow-sm">
            {image && (
              <div className="relative aspect-[21/9]">
                <Image
                    src={car.imageUrl || image.imageUrl}
                    alt={car.make}
                    fill
                    className="object-cover"
                    data-ai-hint={image.imageHint}
                />
              </div>
            )}
            <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg"><CarIcon className="h-6 w-6" /></div>
                <div><p className="text-xs text-muted-foreground">Make/Model</p><p className="font-semibold">{car.make} {car.model}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg"><Calendar className="h-6 w-6" /></div>
                <div><p className="text-xs text-muted-foreground">Year</p><p className="font-semibold">{car.year}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg"><Gauge className="h-6 w-6" /></div>
                <div><p className="text-xs text-muted-foreground">Odometer</p><p className="font-semibold">{car.currentMileage.toLocaleString()} km</p></div>
              </div>
            </CardContent>
          </Card>
          
          <ServiceHistoryList carId={car.id} serviceHistory={serviceHistory} isLoading={isLoading} />
        </div>

        <div className="lg:col-span-1 space-y-8">
          <MileageUpdate car={car} />
          <ServiceHistorySummary car={car} serviceHistory={serviceHistory} />
          <CarMaintenancePredictions car={car} />
        </div>
      </div>
    </div>
  );
}
