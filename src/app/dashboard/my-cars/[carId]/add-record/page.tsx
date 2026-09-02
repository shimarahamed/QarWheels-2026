'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase, safeAddDoc, safeUpdateDoc, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CalendarDays, Gauge, Loader2, Save, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Car, WithId } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const recordSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required'),
  serviceDescription: z.string().min(1, 'Description is required'),
  serviceDate: z.string().min(1, 'Date is required'),
  mileageAtService: z.coerce.number().int().min(0, 'Mileage must be positive'),
  cost: z.coerce.number().min(0, 'Cost must be positive'),
  notes: z.string().optional(),
});

export default function AddServiceRecordPage() {
  const router = useRouter();
  const params = useParams();
  const carId = params.carId as string;
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const carRef = useMemoFirebase(
    () => (user && carId ? doc(firestore, 'users', user.uid, 'cars', carId) : null),
    [firestore, user, carId]
  );
  const { data: car, isLoading: isLoadingCar, error: carError } = useDoc<WithId<Car>>(carRef);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<z.infer<typeof recordSchema>>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      serviceDate: new Date().toISOString().split('T')[0],
      mileageAtService: 0,
    }
  });

  useEffect(() => {
    if (car?.currentMileage) {
      setValue('mileageAtService', car.currentMileage);
    }
  }, [car?.currentMileage, setValue]);

  const onSubmit = async (data: z.infer<typeof recordSchema>) => {
    if (!user || !carId) return;
    setIsSubmitting(true);

    const recordsRef = collection(firestore, 'users', user.uid, 'cars', carId, 'serviceRecords');
    
    const newRecord = {
      ...data,
      userId: user.uid,
      carId: carId,
      vendorId: 'manual_entry',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await safeAddDoc(recordsRef, newRecord);
      if (car && data.mileageAtService >= car.currentMileage) {
        await safeUpdateDoc(doc(firestore, 'users', user.uid, 'cars', carId), {
          currentMileage: data.mileageAtService,
          lastMileageUpdateDate: new Date(data.serviceDate).toISOString(),
          updatedAt: serverTimestamp(),
        });
      }
      toast({
        title: "Record Added",
        description: "Your service history has been updated.",
      });
      router.push(`/dashboard/my-cars/${carId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (carError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Vehicle not found</AlertTitle>
        <AlertDescription>Could not load the vehicle for this service record.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" asChild className="-ml-4">
        <Link href={`/dashboard/my-cars/${carId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Car Details
        </Link>
      </Button>

      <header className="overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Wrench className="h-3.5 w-3.5" />
              Service passport
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Add Service Record</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLoadingCar ? "Loading vehicle..." : car ? `Logging maintenance for ${car.year} ${car.make} ${car.model}.` : "Keep your digital car passport up to date."}
            </p>
          </div>
          {car && (
            <div className="grid grid-cols-2 gap-2 sm:w-80">
              <div className="rounded-xl border bg-background/70 p-3">
                <Gauge className="mb-2 h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="font-bold">{car.currentMileage.toLocaleString()} km</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3">
                <CalendarDays className="mb-2 h-4 w-4 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Year</p>
                <p className="font-bold">{car.year}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>Enter the work performed on your vehicle.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Input id="serviceType" placeholder="e.g., Oil Change, Brake Pad Replacement" {...register('serviceType')} />
              {errors.serviceType && <p className="text-sm text-destructive">{errors.serviceType.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceDescription">Detailed Description</Label>
              <Textarea id="serviceDescription" placeholder="What exactly was done?" {...register('serviceDescription')} />
              {errors.serviceDescription && <p className="text-sm text-destructive">{errors.serviceDescription.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceDate">Date of Service</Label>
                <Input id="serviceDate" type="date" {...register('serviceDate')} />
                {errors.serviceDate && <p className="text-sm text-destructive">{errors.serviceDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileageAtService">Mileage (km)</Label>
                <Input id="mileageAtService" type="number" {...register('mileageAtService')} />
                {errors.mileageAtService && <p className="text-sm text-destructive">{errors.mileageAtService.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Total Cost (QAR)</Label>
              <Input id="cost" type="number" step="0.01" {...register('cost')} />
              {errors.cost && <p className="text-sm text-destructive">{errors.cost.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" placeholder="Optional notes about the parts used, etc." {...register('notes')} />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save to Digital Passport
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
