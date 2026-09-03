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
import { ErrorState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';

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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <ErrorState
          title="Vehicle not found"
          description="Could not load the vehicle for this service record."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <div>
        <Button variant="ghost" asChild className="-ml-4">
          <Link href={`/dashboard/my-cars/${carId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Car Details
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Service passport"
        icon={<Wrench className="h-3.5 w-3.5" />}
        title="Add Service Record"
        description={isLoadingCar ? "Loading vehicle..." : car ? `Logging maintenance for ${car.year} ${car.make} ${car.model}.` : "Keep your digital car passport up to date."}
        action={
          car ? (
            <div className="grid grid-cols-2 gap-3 sm:w-80">
              <StatCard
                label="Current"
                value={`${car.currentMileage.toLocaleString()} km`}
                icon={<Gauge className="h-4 w-4" />}
              />
              <StatCard
                label="Year"
                value={car.year}
                icon={<CalendarDays className="h-4 w-4" />}
                accent="bg-emerald-500/10 text-emerald-600"
              />
            </div>
          ) : undefined
        }
      />

      <Card className="rounded-2xl border bg-card shadow-sm">
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
