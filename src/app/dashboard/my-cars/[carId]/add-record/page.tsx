'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase, safeAddDoc } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const recordSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required'),
  serviceDescription: z.string().min(1, 'Description is required'),
  serviceDate: z.string().min(1, 'Date is required'),
  mileageAtService: z.coerce.number().min(0, 'Mileage must be positive'),
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

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof recordSchema>>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      serviceDate: new Date().toISOString().split('T')[0],
    }
  });

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" asChild className="-ml-4">
        <Link href={`/dashboard/my-cars/${carId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Car Details
        </Link>
      </Button>

      <header>
        <h1 className="text-3xl font-bold font-headline">Add Service Record</h1>
        <p className="text-muted-foreground">Keep your digital car passport up to date.</p>
      </header>

      <Card>
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
