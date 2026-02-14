import { mockCars } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Car, History } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { ServiceHistorySummary } from "@/components/dashboard/service-history-summary";

export default function ServiceHistoryPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Service History</h1>
        <p className="text-muted-foreground">
          A complete, detailed log of all maintenance for your vehicles.
        </p>
      </header>

      {mockCars.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {mockCars.map((car) => {
            const image = PlaceHolderImages.find((img) => img.id === car.imageId);
            return (
              <AccordionItem value={car.id} key={car.id} className="border-b-0 rounded-2xl bg-card border shadow-sm overflow-hidden">
                <AccordionTrigger className="p-6 hover:no-underline">
                  <div className="flex items-center gap-6 text-left w-full">
                    {image && (
                      <Image
                        src={image.imageUrl}
                        alt={car.make}
                        width={120}
                        height={80}
                        className="rounded-lg aspect-video object-cover hidden sm:block"
                        data-ai-hint={image.imageHint}
                      />
                    )}
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold font-headline">
                        {car.year} {car.make} {car.model}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">{car.vin}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                    {car.serviceHistory.length > 0 ? (
                        <div className="grid lg:grid-cols-3 gap-6 items-start">
                            <div className="lg:col-span-2">
                                 <Card>
                                    <CardHeader>
                                        <CardTitle>Service Log</CardTitle>
                                        <CardDescription>A record of all maintenance performed on this vehicle.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
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
                                            {car.serviceHistory
                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                .map((record) => (
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
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-1 space-y-6">
                                 <Card>
                                    <CardHeader>
                                        <CardTitle>Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Total Services</span>
                                            <span className="font-bold">{car.serviceHistory.length}</span>
                                        </div>
                                         <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Total Spent</span>
                                            <span className="font-bold">QAR {car.serviceHistory.reduce((acc, s) => acc + s.cost, 0).toFixed(2)}</span>
                                        </div>
                                    </CardContent>
                                 </Card>
                                <ServiceHistorySummary car={car} />
                            </div>
                        </div>
                    ) : (
                    <div className="text-center text-muted-foreground py-12 px-8 rounded-lg bg-muted/50">
                      <History className="mx-auto h-12 w-12 mb-4 text-primary/50" />
                      <h3 className="font-semibold text-lg">No History Found</h3>
                      <p>No service history has been recorded for this vehicle yet.</p>
                    </div>
                    )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      ) : (
        <Card>
            <CardContent className="text-center text-muted-foreground py-16">
                <Car className="mx-auto h-12 w-12 mb-4 text-primary/50" />
                <h3 className="text-lg font-semibold">No Cars Added</h3>
                <p>You haven't added any cars to your profile yet.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
