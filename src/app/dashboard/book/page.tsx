'use client';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useCollection, useMemoFirebase, safeAddDoc } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Car, WithId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const bookingSchema = z.object({
  carId: z.string().min(1, 'Please select a vehicle'),
  bookingDate: z.date({
    required_error: "A date for the booking is required.",
  }),
});

function BookingForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    
    // Extract booking details from URL
    const garageId = searchParams.get('garageId');
    const garageName = searchParams.get('garageName');
    const serviceName = searchParams.get('serviceName');
    const price = searchParams.get('price');

    const carsCollectionRef = useMemoFirebase(() => (user ? collection(firestore, 'users', user.uid, 'cars') : null), [firestore, user]);
    const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<Car>>(carsCollectionRef);

    const form = useForm<z.infer<typeof bookingSchema>>({
        resolver: zodResolver(bookingSchema),
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!garageId || !serviceName || !garageName) {
        // This will be caught by the parent component and trigger a 404
        notFound();
    }

    async function onSubmit(data: z.infer<typeof bookingSchema>) {
        if (!user || !garageId || !garageName || !serviceName) return;
        setIsSubmitting(true);
        
        const bookingsCollection = collection(firestore, 'bookings');
        
        const newBookingData = {
            userId: user.uid,
            vendorId: garageId,
            vendorName: garageName,
            carId: data.carId,
            serviceName: serviceName,
            bookingDate: data.bookingDate,
            status: 'Confirmed' as const,
            cost: price ? parseFloat(price) : 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        try {
            await safeAddDoc(bookingsCollection, newBookingData);
            toast({
                title: "Booking Confirmed!",
                description: `Your appointment for ${serviceName} is set.`,
            });
            router.push('/dashboard/bookings');
        } catch (e) {
            console.error("Booking failed:", e);
             toast({
                variant: 'destructive',
                title: "Booking Failed",
                description: `Could not complete your booking. Please try again.`,
            });
            setIsSubmitting(false);
        }
    }


    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline">Book a Service</h1>
                <p className="text-muted-foreground">
                    Confirm details for your appointment at <span className="font-semibold text-primary">{garageName}</span>.
                </p>
            </header>
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>{serviceName}</CardTitle>
                    {price && <CardDescription>Estimated Cost: QAR {parseFloat(price).toFixed(2)}</CardDescription>}
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                         <div className="space-y-2">
                            <Label>Vehicle</Label>
                             <Controller
                                control={form.control}
                                name="carId"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCars}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingCars ? "Loading your cars..." : "Select a vehicle"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cars?.map(car => (
                                                <SelectItem key={car.id} value={car.id}>
                                                    {car.year} {car.make} {car.model}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.carId && <p className="text-sm text-destructive">{form.formState.errors.carId.message}</p>}
                        </div>
                         <div className="space-y-2">
                             <Label>Appointment Date</Label>
                             <Controller
                                control={form.control}
                                name="bookingDate"
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                            {form.formState.errors.bookingDate && <p className="text-sm text-destructive">{form.formState.errors.bookingDate.message}</p>}
                        </div>
                        <Button type="submit" disabled={isSubmitting || isLoadingCars}>
                           {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirm Booking
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

// Wrap the component in Suspense because useSearchParams requires it.
export default function BookPage() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <BookingForm />
        </Suspense>
    )
}