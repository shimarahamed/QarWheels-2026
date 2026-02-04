import { mockCars } from "@/lib/data";
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
import { Car, History } from "lucide-react";
import { format } from "date-fns";

export default function ServiceHistoryPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Service History</h1>
        <p className="text-muted-foreground">
          A complete log of all maintenance for your vehicles.
        </p>
      </header>

      {mockCars.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
          {mockCars.map((car) => (
            <AccordionItem value={car.id} key={car.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-4">
                  <Car className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">
                    {car.year} {car.make} {car.model}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center text-muted-foreground py-12">
            <Car className="mx-auto h-12 w-12 mb-4" />
            <p>You haven't added any cars yet.</p>
        </div>
      )}
    </div>
  );
}