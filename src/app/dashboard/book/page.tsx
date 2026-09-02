'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useCollection, useDoc, useMemoFirebase, safeAddDoc } from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, Car as CarIcon, Loader2, CheckCircle2, ChevronLeft, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Car, UserProfile, WithId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';

const bookingSchema = z.object({
  carId: z.string().min(1, 'Please select a vehicle'),
  bookingDate: z.date({
    required_error: 'A date for the booking is required.',
  }),
  bookingTime: z.string().min(1, 'Please select a time'),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const garageId = searchParams.get('garageId');
  const businessId = searchParams.get('businessId');
  const garageName = searchParams.get('garageName');
  const serviceName = searchParams.get('serviceName');
  const price = searchParams.get('price');

  const carsCollectionRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<Car>>(carsCollectionRef);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const isGuest = Boolean(user?.isAnonymous);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      bookingTime: '09:00',
      notes: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  // null = form step, non-null = review step with confirmed values
  const [pendingValues, setPendingValues] = useState<BookingFormValues | null>(null);

  if (!garageId || !serviceName || !garageName) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline">Book a Service</h1>
          <p className="text-muted-foreground">
            Choose a garage and service first, then confirm the appointment details.
          </p>
        </header>
        <Card className="max-w-2xl">
          <CardContent className="p-6">
            <EmptyState
              icon={<Wrench className="h-8 w-8" />}
              title="Select a garage to continue"
              description="Bookings are created from a garage service list so the request includes the garage, service, and price context."
              action={
                <Button asChild>
                  <a href="/dashboard/garages">Browse Garages</a>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedCar = cars?.find((c) => c.id === pendingValues?.carId);

  function onFormSubmit(data: BookingFormValues) {
    if (!user) return;
    if (user.isAnonymous) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Create an account or sign in before booking a service.',
      });
      router.push(`/login?redirect=${encodeURIComponent('/dashboard/book?' + searchParams.toString())}`);
      return;
    }
    setPendingValues(data);
  }

  async function onConfirm() {
    if (!user || !pendingValues || !garageId || !garageName || !serviceName) return;
    setIsSubmitting(true);

    const [hours, minutes] = pendingValues.bookingTime.split(':').map(Number);
    const appointmentDate = new Date(pendingValues.bookingDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    const bookingsCollection = collection(firestore, 'bookings');
    const newBookingData = {
      userId: user.uid,
      customerName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : (user.displayName || 'Customer'),
      customerEmail: userProfile?.email || user.email || '',
      customerPhone: userProfile?.phoneNumber || '',
      businessId: businessId || '',
      branchId: garageId,
      branchName: garageName,
      carId: pendingValues.carId,
      carDescription: selectedCar ? `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}` : '',
      serviceName,
      bookingDate: appointmentDate,
      status: 'Pending' as const,
      // Rules require a new booking to open with exactly one history entry.
      statusHistory: [
        {
          status: 'Pending' as const,
          at: Timestamp.now(),
          byUid: user.uid,
          byRole: 'customer' as const,
        },
      ],
      cost: price ? parseFloat(price) : 0,
      notes: pendingValues.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await safeAddDoc(bookingsCollection, newBookingData);
      toast({
        title: 'Booking Request Sent',
        description: `${garageName} can now confirm your ${serviceName} appointment.`,
      });
      router.push('/dashboard/bookings');
    } catch (e) {
      console.error('Booking failed:', e);
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: 'Could not complete your booking. Please try again.',
      });
      setIsSubmitting(false);
    }
  }

  // ── Review / confirmation screen ──────────────────────────────────────────
  if (pendingValues) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline">Confirm Your Booking</h1>
          <p className="text-muted-foreground">
            Review the details below before sending your request to{' '}
            <span className="font-semibold text-primary">{garageName}</span>.
          </p>
        </header>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Booking Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Garage</p>
                <p className="mt-1 font-medium">{garageName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service</p>
                <p className="mt-1 font-medium">{serviceName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</p>
                <p className="mt-1 font-medium">{format(pendingValues.bookingDate, 'PPP')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</p>
                <p className="mt-1 font-medium">{pendingValues.bookingTime}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</p>
                <p className="mt-1 font-medium">
                  {selectedCar
                    ? `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}`
                    : pendingValues.carId}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimated Cost</p>
                <p className="mt-1 font-medium">
                  {price ? `QAR ${parseFloat(price).toFixed(2)}` : 'Confirmed by garage'}
                </p>
              </div>
            </div>

            {pendingValues.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 text-muted-foreground">{pendingValues.notes}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setPendingValues(null)}
                disabled={isSubmitting}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
              <Button onClick={onConfirm} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm &amp; Send Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Booking form ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Book a Service</h1>
        <p className="text-muted-foreground">
          Confirm details for your appointment at{' '}
          <span className="font-semibold text-primary">{garageName}</span>.
        </p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{serviceName}</CardTitle>
          <CardDescription>
            {price
              ? `Estimated Cost: QAR ${parseFloat(price).toFixed(2)}`
              : 'The garage will confirm final pricing.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isGuest && (
            <Alert className="mb-6">
              <AlertTitle>Sign in to book</AlertTitle>
              <AlertDescription>
                Guest mode is browse-only. Create an account or sign in so the garage can confirm
                and manage your appointment.
              </AlertDescription>
            </Alert>
          )}
          {!isLoadingCars && (!cars || cars.length === 0) ? (
            <EmptyState
              icon={<CarIcon className="h-8 w-8" />}
              title="Add a car before booking"
              description="Bookings need to be attached to a vehicle so the garage knows what they are servicing."
              action={
                <Button asChild>
                  <a href="/dashboard/my-cars/add">Add Your First Car</a>
                </Button>
              }
            />
          ) : (
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Controller
                  control={form.control}
                  name="carId"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoadingCars}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={isLoadingCars ? 'Loading your cars...' : 'Select a vehicle'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {cars?.map((car) => (
                          <SelectItem key={car.id} value={car.id}>
                            {car.year} {car.make} {car.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.carId && (
                  <p className="text-sm text-destructive">{form.formState.errors.carId.message}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Appointment Date</Label>
                  <Controller
                    control={form.control}
                    name="bookingDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.bookingDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.bookingDate.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time</Label>
                  <Controller
                    control={form.control}
                    name="bookingTime"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'].map(
                            (slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.bookingTime && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.bookingTime.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes for the garage</Label>
                <Textarea
                  id="notes"
                  placeholder="Tell the garage about symptoms, preferred parts, pickup needs, or anything important."
                  {...form.register('notes')}
                />
                {form.formState.errors.notes && (
                  <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoadingCars || isGuest || !cars || cars.length === 0}
              >
                Review Booking
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <BookingForm />
    </Suspense>
  );
}
