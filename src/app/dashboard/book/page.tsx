'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, Suspense } from 'react';
import { useFirebase, useCollection, useDoc, useMemoFirebase, safeAddDoc } from '@/firebase';
import { collection, doc, query, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar as CalendarIcon,
  Car as CarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  Loader2,
  PlusCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { format, isSameDay, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Car, Service, UserProfile, WithId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';

// ─── Wizard shape ─────────────────────────────────────────────────────────────
// One route, four internal steps. Kept as internal state rather than nested
// routes so the ?garageId=&businessId=&garageName=&serviceName=&price= entry
// from the garage detail page survives every step without re-encoding.

const STEPS = [
  { id: 'vehicle', label: 'Vehicle', icon: CarIcon },
  { id: 'schedule', label: 'Date & time', icon: CalendarIcon },
  { id: 'addons', label: 'Add-ons', icon: PlusCircle },
  { id: 'review', label: 'Review', icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

type BookingDraft = {
  carId: string;
  bookingDate: Date | undefined;
  bookingTime: string;
  addOnIds: string[];
  notes: string;
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepRail({ current, maxReached, onJump }: {
  current: number;
  maxReached: number;
  onJump: (index: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isDone = index < current;
        const isCurrent = index === current;
        // Only steps the user has already completed are clickable — jumping
        // ahead would skip the validation each step gates on.
        const canJump = index <= maxReached;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => canJump && onJump(index)}
              disabled={!canJump}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isDone && 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10',
                !isCurrent && !isDone && 'border-border bg-background text-muted-foreground',
                !canJump && 'cursor-not-allowed opacity-70',
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{index + 1}</span>
            </button>
            {index < STEPS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

function BookingWizard() {
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

  // Add-ons are the garage's *other* real services rather than a hardcoded
  // list, so every add-on price is one a branch actually charges and the cost
  // written to the booking stays truthful.
  const addOnServicesRef = useMemoFirebase(
    () =>
      garageId
        ? query(collection(firestore, 'branch_services'), where('branchId', '==', garageId))
        : null,
    [firestore, garageId]
  );
  const { data: branchServices, isLoading: isLoadingAddOns } =
    useCollection<WithId<Service>>(addOnServicesRef);

  const isGuest = Boolean(user?.isAnonymous);

  const [stepIndex, setStepIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState<BookingDraft>({
    carId: '',
    bookingDate: undefined,
    bookingTime: '09:00',
    addOnIds: [],
    notes: '',
  });

  const patch = (next: Partial<BookingDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  const basePrice = price ? parseFloat(price) : 0;

  const availableAddOns = useMemo(
    () =>
      (branchServices ?? []).filter(
        (service) => service.active !== false && service.name !== serviceName
      ),
    [branchServices, serviceName]
  );

  const selectedAddOns = useMemo(
    () => availableAddOns.filter((service) => draft.addOnIds.includes(service.id)),
    [availableAddOns, draft.addOnIds]
  );

  const addOnTotal = selectedAddOns.reduce((sum, service) => sum + Number(service.price ?? 0), 0);
  const estimatedTotal = basePrice + addOnTotal;

  const selectedCar = cars?.find((car) => car.id === draft.carId) ?? null;

  // ── Entry guard ─────────────────────────────────────────────────────────────
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

  // ── Per-step validation ─────────────────────────────────────────────────────
  const stepError = ((): string | null => {
    const step: StepId = STEPS[stepIndex].id;
    if (step === 'vehicle' && !draft.carId) return 'Select which vehicle needs servicing.';
    if (step === 'schedule') {
      if (!draft.bookingDate) return 'Pick a date for the appointment.';
      if (!draft.bookingTime) return 'Pick a preferred time.';
    }
    if (step === 'review' && draft.notes.length > 500) {
      return 'Notes must be under 500 characters.';
    }
    return null;
  })();

  const goNext = () => {
    if (stepError) return;
    const next = Math.min(stepIndex + 1, STEPS.length - 1);
    setStepIndex(next);
    setMaxReached((prev) => Math.max(prev, next));
  };

  const goBack = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  // ── Submit ──────────────────────────────────────────────────────────────────
  // This write is unchanged from the single-page form: same Phase 1 shape,
  // same required single-entry statusHistory the rules check for.
  async function onConfirm() {
    if (!user || !draft.bookingDate || !garageId || !garageName || !serviceName) return;

    if (user.isAnonymous) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Create an account or sign in before booking a service.',
      });
      router.push(`/login?redirect=${encodeURIComponent('/dashboard/book?' + searchParams.toString())}`);
      return;
    }

    setIsSubmitting(true);

    const [hours, minutes] = draft.bookingTime.split(':').map(Number);
    const appointmentDate = new Date(draft.bookingDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    // Add-ons ride along in notes because the booking document has no add-on
    // field — inventing one would need a schema/rules change, which is out of
    // scope here. Their prices are still reflected in `cost`.
    const addOnNote = selectedAddOns.length
      ? `Add-ons requested: ${selectedAddOns
          .map((service) => `${service.name} (QAR ${Number(service.price ?? 0).toFixed(2)})`)
          .join(', ')}`
      : '';
    const combinedNotes = [draft.notes.trim(), addOnNote].filter(Boolean).join('\n\n').slice(0, 500);

    const bookingsCollection = collection(firestore, 'bookings');
    const newBookingData = {
      userId: user.uid,
      customerName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : (user.displayName || 'Customer'),
      customerEmail: userProfile?.email || user.email || '',
      customerPhone: userProfile?.phoneNumber || '',
      businessId: businessId || '',
      branchId: garageId,
      branchName: garageName,
      carId: draft.carId,
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
      cost: estimatedTotal,
      notes: combinedNotes,
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

  // ── No cars ─────────────────────────────────────────────────────────────────
  if (!isLoadingCars && (!cars || cars.length === 0)) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline">Book a Service</h1>
        </header>
        <Card className="max-w-2xl">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep: StepId = STEPS[stepIndex].id;
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <Badge variant="outline" className="mb-3 h-7 gap-2 bg-primary/5 px-3 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Step {stepIndex + 1} of {STEPS.length}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Book a Service</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-foreground">{serviceName}</span> at{' '}
          <span className="font-semibold text-primary">{garageName}</span>
          {basePrice > 0 ? ` · from QAR ${basePrice.toFixed(2)}` : ' · price confirmed by the garage'}
        </p>
        <div className="mt-5">
          <StepRail current={stepIndex} maxReached={maxReached} onJump={setStepIndex} />
        </div>
      </header>

      {isGuest && (
        <Alert>
          <AlertTitle>Sign in to book</AlertTitle>
          <AlertDescription>
            Guest mode is browse-only. Create an account or sign in so the garage can confirm and
            manage your appointment.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[stepIndex].label}</CardTitle>
          <CardDescription>
            {currentStep === 'vehicle' && 'Which car are we servicing?'}
            {currentStep === 'schedule' && 'Choose when you would like to bring it in.'}
            {currentStep === 'addons' && 'Optional extras this garage offers alongside your service.'}
            {currentStep === 'review' && 'Check everything over, then send the request.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ── Step 1: Vehicle ─────────────────────────────────────────────── */}
          {currentStep === 'vehicle' && (
            <div className="space-y-3">
              {isLoadingCars && <Skeleton className="h-20 w-full rounded-xl" />}
              {cars?.map((car) => {
                const isSelected = draft.carId === car.id;
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => patch({ carId: car.id })}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:border-primary/50 hover:bg-muted/40'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <CarIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {car.year} {car.make} {car.model}
                      </p>
                      <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          {car.currentMileage?.toLocaleString() ?? 0} km
                        </span>
                        {car.licensePlate && <span className="truncate">{car.licensePlate}</span>}
                      </p>
                    </div>
                    {isSelected && <Check className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Step 2: Date & time ─────────────────────────────────────────── */}
          {currentStep === 'schedule' && (
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="space-y-2">
                <Label>Appointment date</Label>
                <div className="rounded-xl border p-1">
                  <Calendar
                    mode="single"
                    selected={draft.bookingDate}
                    onSelect={(date) => patch({ bookingDate: date })}
                    disabled={(date) => date < startOfToday()}
                    initialFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preferred time</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = draft.bookingTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => patch({ bookingTime: slot })}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-all',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:border-primary/50 hover:bg-muted/40'
                        )}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {draft.bookingDate && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    Requesting{' '}
                    <span className="font-semibold text-foreground">
                      {format(draft.bookingDate, 'EEEE, d MMMM')} at {draft.bookingTime}
                    </span>
                    {isSameDay(draft.bookingDate, startOfToday()) && ' — same-day requests depend on availability.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Add-ons ─────────────────────────────────────────────── */}
          {currentStep === 'addons' && (
            <div className="space-y-3">
              {isLoadingAddOns && <Skeleton className="h-20 w-full rounded-xl" />}

              {!isLoadingAddOns && availableAddOns.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <PlusCircle className="mx-auto mb-2 h-8 w-8 text-primary/40" />
                  <p className="font-medium text-foreground">No optional extras listed</p>
                  <p className="mt-1">
                    This garage hasn&apos;t published additional services. Continue to review.
                  </p>
                </div>
              )}

              {availableAddOns.map((service) => {
                const isSelected = draft.addOnIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:border-primary/50 hover:bg-muted/40'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        patch({
                          addOnIds: checked
                            ? [...draft.addOnIds, service.id]
                            : draft.addOnIds.filter((id) => id !== service.id),
                        })
                      }
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{service.name}</p>
                      {service.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{service.description}</p>
                      )}
                      {Number(service.duration) > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ~{Number(service.duration)} mins
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-bold">QAR {Number(service.price ?? 0).toFixed(2)}</p>
                  </label>
                );
              })}
            </div>
          )}

          {/* ── Step 4: Review ──────────────────────────────────────────────── */}
          {currentStep === 'review' && (
            <div className="space-y-5 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Garage</p>
                  <p className="mt-1 font-medium">{garageName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service</p>
                  <p className="mt-1 font-medium">{serviceName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</p>
                  <p className="mt-1 font-medium">
                    {selectedCar
                      ? `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}`
                      : draft.carId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">When</p>
                  <p className="mt-1 font-medium">
                    {draft.bookingDate ? format(draft.bookingDate, 'PPP') : '—'} at {draft.bookingTime}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estimated cost
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{serviceName}</span>
                  <span className="font-medium">
                    {basePrice > 0 ? `QAR ${basePrice.toFixed(2)}` : 'Confirmed by garage'}
                  </span>
                </div>
                {selectedAddOns.map((service) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{service.name}</span>
                    <span className="font-medium">QAR {Number(service.price ?? 0).toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">
                    {estimatedTotal > 0 ? `QAR ${estimatedTotal.toFixed(2)}` : 'Confirmed by garage'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  An estimate — the garage confirms final pricing after inspection.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="notes">Notes for the garage</Label>
                <Textarea
                  id="notes"
                  value={draft.notes}
                  onChange={(event) => patch({ notes: event.target.value })}
                  maxLength={500}
                  placeholder="Tell the garage about symptoms, preferred parts, pickup needs, or anything important."
                />
                <p className="text-right text-xs text-muted-foreground">{draft.notes.length}/500</p>
              </div>
            </div>
          )}

          {/* ── Nav ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={stepIndex === 0 || isSubmitting}
              className="sm:w-auto"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {stepError && (
                <p className="text-sm text-destructive sm:mr-2">{stepError}</p>
              )}
              {isLastStep ? (
                <Button onClick={onConfirm} disabled={isSubmitting || isGuest || Boolean(stepError)}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm &amp; Send Request
                </Button>
              ) : (
                <Button onClick={goNext} disabled={Boolean(stepError)}>
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
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
      <BookingWizard />
    </Suspense>
  );
}
