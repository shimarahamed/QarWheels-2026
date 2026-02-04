import { mockCars } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Car as CarIcon,
  Calendar,
  Gauge,
  ArrowLeft,
  History,
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
import { notFound } from "next/navigation";
import { CarMaintenancePredictions } from "@/components/dashboard/car-maintenance-predictions";
import { ServiceHistorySummary } from "@/components/dashboard/service-history-summary";
import Link from "next/link";
import { format } from "date-fns";

export default function CarDetailsPage({
  params,
}: {
  params: { carId: string };
}) {
  const car = mockCars.find((c) => c.id === params.carId);

  if (!car) {
    notFound();
  }

  const image = PlaceHolderImages.find((img) => img.id === car.imageId);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/my-cars"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Cars
      </Link>

      <header>
        <h1 className="text-3xl font-bold font-headline">
          {car.year} {car.make} {car.model}
        </h1>
        <p className="text-muted-foreground">{car.vin}</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            {image && (
              <Image
                src={image.imageUrl}
                alt={car.make + " " + car.model}
                width={800}
                height={450}
                className="w-full aspect-video object-cover rounded-t-lg"
                data-ai-hint={image.imageHint}
              />
            )}
            <CardHeader>
              <CardTitle>Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <CarIcon className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Make/Model</p>
                  <p className="font-semibold">
                    {car.make} {car.model}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-semibold">{car.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Gauge className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Mileage</p>
                  <p className="font-semibold">
                    {car.mileage.toLocaleString()} km
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
              {car.serviceHistory.length > 0 ? (
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
                        <TableCell className="font-medium">
                          {format(new Date(record.date), "PPP")}
                        </TableCell>
                        <TableCell>{record.service}</TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell className="text-right">
                          QAR {record.cost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <History className="mx-auto h-12 w-12 mb-4" />
                  <p>No service history recorded for this vehicle.</p>
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
