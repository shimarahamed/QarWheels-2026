'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { format, isValid } from 'date-fns';
import { collection } from 'firebase/firestore';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, LoadingPanel } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ServiceHistorySummary } from '@/components/dashboard/service-history-summary';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Car, ServiceRecord, WithId } from '@/lib/types';
import {
  ArrowRight,
  Calendar,
  Car as CarIcon,
  CircleDollarSign,
  Download,
  FileText,
  Gauge,
  History,
  Printer,
  PlusCircle,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-react';

function exportCsv(car: WithId<Car>, records: WithId<ServiceRecord>[]) {
  const rows = [
    ['Date', 'Service Type', 'Description', 'Mileage (km)', 'Cost (QAR)', 'Notes'],
    ...records
      .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())
      .map((r) => [
        r.serviceDate,
        r.serviceType,
        r.serviceDescription,
        String(r.mileageAtService),
        String(r.cost),
        r.notes ?? '',
      ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `service-history-${car.year}-${car.make}-${car.model}-${car.vin}.csv`.replace(/\s+/g, '-');
  a.click();
  URL.revokeObjectURL(url);
}

function printPassport(car: WithId<Car>, records: WithId<ServiceRecord>[]) {
  const rows = records
    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())
    .map(
      (r) => `<tr>
        <td>${r.serviceDate}</td>
        <td>${r.serviceType}</td>
        <td>${r.serviceDescription}</td>
        <td>${r.mileageAtService.toLocaleString()} km</td>
        <td>QAR ${r.cost.toLocaleString()}</td>
        <td>${r.notes ?? ''}</td>
      </tr>`
    )
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Service Passport – ${car.year} ${car.make} ${car.model}</title>
    <style>
      body{font-family:sans-serif;padding:32px;color:#111}
      h1{font-size:1.4rem;margin-bottom:4px}
      p{color:#555;font-size:.85rem;margin:0 0 20px}
      table{width:100%;border-collapse:collapse;font-size:.85rem}
      th{background:#f3f4f6;text-align:left;padding:8px 10px;border-bottom:2px solid #e5e7eb}
      td{padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
    </style></head><body>
    <h1>Service Passport — ${car.year} ${car.make} ${car.model}</h1>
    <p>VIN: ${car.vin} &nbsp;|&nbsp; Odometer: ${car.currentMileage.toLocaleString()} km${car.licensePlate ? ` &nbsp;|&nbsp; Plate: ${car.licensePlate}` : ''}</p>
    <table><thead><tr>
      <th>Date</th><th>Type</th><th>Description</th><th>Mileage</th><th>Cost</th><th>Notes</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print();window.close()}</script>
    </body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

function toDate(value: string) {
  const date = new Date(value);
  return isValid(date) ? date : null;
}

function getCarImage(car: WithId<Car>) {
  return (
    (car.imageId ? PlaceHolderImages.find((img) => img.id === car.imageId) : undefined) ||
    PlaceHolderImages.find((img) => car.make.toLowerCase().includes(img.imageHint.split(' ')[1] || '')) ||
    PlaceHolderImages[1]
  );
}

function RecordTimeline({ records }: { records: WithId<ServiceRecord>[] }) {
  return (
    <div className="space-y-3">
      {[...records]
        .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())
        .map((record) => {
          const date = toDate(record.serviceDate);
          return (
            <div key={record.id} className="rounded-2xl border bg-background/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary">{record.serviceType}</Badge>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {date ? format(date, 'MMM d, yyyy') : 'Date unavailable'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{record.serviceDescription}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-64">
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Mileage</p>
                    <p className="mt-1 text-sm font-bold">{record.mileageAtService.toLocaleString()} km</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cost</p>
                    <p className="mt-1 text-sm font-bold">QAR {record.cost.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              {record.notes && (
                <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                  {record.notes}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

function CarServiceHistory({ car, searchTerm }: { car: WithId<Car>; searchTerm: string }) {
  const { firestore, user } = useFirebase();
  const serviceHistoryRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/cars/${car.id}/serviceRecords`) : null),
    [firestore, user, car.id]
  );
  const { data: carServiceHistory, isLoading } = useCollection<WithId<ServiceRecord>>(serviceHistoryRef);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (carServiceHistory || []).filter((record) => {
      if (!term) return true;
      return (
        record.serviceType.toLowerCase().includes(term) ||
        record.serviceDescription.toLowerCase().includes(term) ||
        record.notes?.toLowerCase().includes(term)
      );
    });
  }, [carServiceHistory, searchTerm]);

  if (isLoading) {
    return (
      <AccordionContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <LoadingPanel rows={3} />
      </AccordionContent>
    );
  }

  const totalSpent = filteredRecords.reduce((acc, record) => acc + (record.cost || 0), 0);
  const lastRecord = [...filteredRecords].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];

  return (
    <AccordionContent className="p-4 pt-0 sm:p-6 sm:pt-0">
      {filteredRecords.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsv(car, filteredRecords)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => printPassport(car, filteredRecords)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Save as PDF
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Records" value={filteredRecords.length} icon={<History className="h-4 w-4" />} />
              <StatCard
                label="Spend"
                value={`QAR ${totalSpent.toLocaleString()}`}
                icon={<CircleDollarSign className="h-4 w-4" />}
                accent="bg-emerald-500/10 text-emerald-600"
              />
              <StatCard
                label="Last visit"
                value={lastRecord ? format(toDate(lastRecord.serviceDate) || new Date(), 'MMM d, yyyy') : 'N/A'}
                icon={<Calendar className="h-4 w-4" />}
                accent="bg-amber-500/10 text-amber-600"
              />
            </div>
            <RecordTimeline records={filteredRecords} />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Passport summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Current odometer</span>
                  <span className="font-bold">{car.currentMileage.toLocaleString()} km</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">VIN</span>
                  <span className="truncate font-mono text-xs">{car.vin}</span>
                </div>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href={`/dashboard/my-cars/${car.id}/add-record`}>
                    Add maintenance record
                    <PlusCircle className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <ServiceHistorySummary car={car} serviceHistory={filteredRecords} />
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="No matching records"
          description="Try a different search term or add the first service record for this vehicle."
          action={
            <Button asChild>
              <Link href={`/dashboard/my-cars/${car.id}/add-record`}>Add Record</Link>
            </Button>
          }
        />
      )}
    </AccordionContent>
  );
}

export default function ServiceHistoryPage() {
  const { firestore, user } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');

  const carsCollectionRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<Car>>(carsCollectionRef);

  const visibleCars = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return cars || [];
    return (cars || []).filter((car) =>
      `${car.year} ${car.make} ${car.model} ${car.vin} ${car.licensePlate || ''}`.toLowerCase().includes(term)
    );
  }, [cars, searchTerm]);

  if (isLoadingCars) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <LoadingPanel rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Digital service passport"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        title="History built for proof, planning, and resale."
        description="Search across vehicles, inspect service timelines, summarize maintenance, and keep every important record close."
        action={
          <Button asChild className="justify-start">
            <Link href="/dashboard/my-cars">
              Manage Vehicles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <section className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search vehicle, VIN, plate, service type, notes..."
            className="h-11 pl-10 text-base"
          />
        </div>
      </section>

      {visibleCars.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {visibleCars.map((car) => {
            const image = getCarImage(car);

            return (
              <AccordionItem
                value={car.id}
                key={car.id}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <AccordionTrigger className="p-4 hover:no-underline sm:p-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4 text-left">
                    {image && (
                      <Image
                        src={car.imageUrl || image.imageUrl}
                        alt={car.make}
                        width={112}
                        height={76}
                        className="hidden aspect-video rounded-xl object-cover sm:block"
                        data-ai-hint={image.imageHint}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-bold sm:text-xl">
                          {car.year} {car.make} {car.model}
                        </h2>
                        {car.licensePlate && <Badge variant="outline" className="bg-primary/5 text-primary">{car.licensePlate}</Badge>}
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate font-mono">{car.vin}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Gauge className="h-4 w-4 shrink-0 text-primary" />
                          {car.currentMileage.toLocaleString()} km
                        </span>
                        <span className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 shrink-0 text-primary" />
                          {car.engineType || 'Engine not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <CarServiceHistory car={car} searchTerm={searchTerm} />
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <EmptyState
          icon={<CarIcon className="h-8 w-8" />}
          title="No vehicles found"
          description="Add a vehicle or clear your search to see the full service passport."
          action={
            <Button asChild>
              <Link href="/dashboard/my-cars/add">Add Your First Car</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
