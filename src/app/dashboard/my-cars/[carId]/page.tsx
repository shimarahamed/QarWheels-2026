'use client';

import {
  Car as CarIcon,
  Calendar,
  Gauge,
  ArrowLeft,
  History,
  Loader2,
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
import { notFound, useParams } from "next/navigation";
import { CarMaintenancePredictions } from "@/components/dashboard/car-maintenance-predictions";
import { ServiceHistorySummary } from "@/components/dashboard/service-history-summary";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { Car } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function CarDetailsPage() {
  const params = useParams();
  const carId = params.carId as string;
  const { firestore, user } = useFirebase();

  const carRef = useMemoFirebase(
    () => (user && carId ? doc(firestore, 'users', user.uid, 'cars', carId) : null),
    [firestore, user, carId]
  );
  const { data: car, isLoading } = useDoc<Car>(carRef);
  
  if (isLoading) {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if (!car) {
    notFound();
  }

  const image = PlaceHolderImages.find((img) => car.make.toLowerCase().includes(img.imageHint.split(' ')[1])) || PlaceHolderImages[1];

  return (
    <div className="space-y-6">
       <Button variant="ghost" asChild className="-ml-4">
        <Link
          href="/dashboard/my-cars"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Cars
        </Link>
      </Button>

      <header>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          {car.year} {car.make} {car.model}
        </h1>
        <p className="text-muted-foreground font-mono">{car.vin}</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <Card className="overflow-hidden">
            {image && (
              <Image
                src={car.imageUrl || image.imageUrl}
                alt={car.make + " " + car.model}
                width={800}
                height={450}
                className="w-full aspect-video object-cover"
                data-ai-hint={image.imageHint}
              />
            )}
            <CardHeader>
              <CardTitle>Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                    <CarIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Make/Model</p>
                  <p className="font-semibold">
                    {car.make} {car.model}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                    <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-semibold">{car.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                    <Gauge className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mileage</p>
                  <p className="font-semibold">
                    {car.currentMileage.toLocaleString()} km
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service History</CardTitle>
              <CardDescription>
                A log of all maintenance performed on this vehicle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {car.serviceHistory && car.serviceHistory.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {car.serviceHistory.map((record) => (
                        <TableRow key={record.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(record.date), "PPP")}
                            </TableCell>
                            <TableCell>{record.service}</TableCell>
                            <TableCell>{record.description}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                            QAR {record.cost.toFixed(2)}
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12 px-8 rounded-lg bg-muted/50">
                  <History className="mx-auto h-12 w-12 mb-4 text-primary/50" />
                  <h3 className="font-semibold text-lg">No History Found</h3>
                  <p>No service history has been recorded for this vehicle yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-8">
          <ServiceHistorySummary car={car} />
          <CarMaintenancePredictions car={car} />
        </div>
      </div>
    </div>
  );
}
