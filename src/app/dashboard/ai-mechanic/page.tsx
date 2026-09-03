'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowUp,
  Car as CarIcon,
  CheckCircle2,
  Gauge,
  Loader2,
  LogIn,
  RotateCcw,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useDiagnose, validateDiagnoseInput, type DiagnoseFailure } from '@/hooks/use-diagnose';
import { cn } from '@/lib/utils';
import type { Car, DiagnoseResult, WithId } from '@/lib/types';

// ─── Urgency presentation ─────────────────────────────────────────────────────

const URGENCY_STYLES: Record<DiagnoseResult['urgency'], { badge: string; label: string }> = {
  Low: { badge: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Low urgency — safe to drive' },
  Medium: { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium urgency — keep monitoring' },
  High: { badge: 'bg-orange-100 text-orange-800 border-orange-200', label: 'High urgency — book soon' },
  Critical: { badge: 'bg-red-100 text-red-800 border-red-200', label: 'Critical — do not drive' },
};

const SUGGESTIONS = [
  'My check engine light came on this morning',
  'The AC is blowing warm air in traffic',
  'Brakes squeal when I stop at low speed',
  'The car vibrates at highway speed',
  'Oil pressure warning light is flickering',
  'Battery keeps dying overnight',
  'Steering feels heavy when parking',
  'Temperature gauge climbs in traffic',
];

// ─── Message model ────────────────────────────────────────────────────────────
// A turn is either something the user typed or a rendered diagnosis. Keeping
// the full DiagnoseResult on the assistant turn (rather than flattening it to
// text) is what lets the transcript stay scrollable while each answer still
// renders its causes, services and confidence as structured UI.

type ChatTurn =
  | { id: string; role: 'user'; text: string; at: Date }
  | { id: string; role: 'assistant'; intro: string; result: DiagnoseResult | null; at: Date };

let turnCounter = 0;
const nextTurnId = () => `turn_${(turnCounter += 1)}`;

const WELCOME =
  "Hi — I'm the QarWheel AI Mechanic. Pick the car you're worried about, then tell me what's happening: a warning light, a noise, a smell, a feeling through the wheel. The more detail you give, the sharper the diagnosis.";

// ─── Diagnosis card ───────────────────────────────────────────────────────────

function DiagnosisCard({ result }: { result: DiagnoseResult }) {
  const urgency = URGENCY_STYLES[result.urgency] ?? URGENCY_STYLES.Medium;
  const confidencePct = Math.round((result.confidence ?? 0) * 100);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn('border', urgency.badge)}>
          <AlertTriangle className="mr-1 h-3 w-3" />
          {urgency.label}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Gauge className="h-3 w-3" />
          {confidencePct}% confidence
        </Badge>
      </div>

      <div className="space-y-1.5">
        <Progress value={confidencePct} className="h-1.5" />
        <p className="text-[11px] text-muted-foreground">
          How strongly the model matches your description to this diagnosis.
        </p>
      </div>

      <p className="text-sm leading-relaxed">{result.diagnosis}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Potential causes
          </h4>
          <ul className="space-y-1.5">
            {result.potentialCauses.map((cause) => (
              <li key={cause} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-muted-foreground">{cause}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Recommended services
          </h4>
          <ul className="space-y-1.5">
            {result.recommendedServices.map((service) => (
              <li key={service} className="flex items-start gap-2 text-sm font-medium text-primary">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{service}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-5 text-muted-foreground">{result.disclaimer}</p>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/dashboard/garages">
            <Wrench className="mr-2 h-4 w-4" />
            Find a garage
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Failure presentation ─────────────────────────────────────────────────────

function FailureAlert({ failure, onRetry }: { failure: DiagnoseFailure; onRetry: () => void }) {
  if (failure.kind === 'unauthorized') {
    return (
      <Alert variant="destructive">
        <LogIn className="h-4 w-4" />
        <AlertTitle>Session expired</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{failure.message}</p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/login?redirect=${encodeURIComponent('/dashboard/ai-mechanic')}`}>
              Sign in again
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (failure.kind === 'rate-limit') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>You&apos;ve reached today&apos;s limit</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{failure.message}</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/garages">Browse garages</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const retryable = failure.kind === 'network' || failure.kind === 'unavailable';

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{retryable ? 'Diagnosis failed' : 'Check your details'}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{failure.message}</p>
        {retryable && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiMechanicPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const { diagnose, isLoading } = useDiagnose();

  const carsRef = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user],
  );
  const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<Car>>(carsRef);

  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [failure, setFailure] = useState<DiagnoseFailure | null>(null);
  // Kept so the "Try again" button can resend without retyping.
  const [lastAttempt, setLastAttempt] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Default to the first car so a single-car user never has to touch the picker.
  useEffect(() => {
    if (!selectedCarId && cars && cars.length > 0) setSelectedCarId(cars[0].id);
  }, [cars, selectedCarId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, isLoading]);

  const selectedCar = useMemo(
    () => cars?.find((car) => car.id === selectedCarId) ?? null,
    [cars, selectedCarId],
  );

  const isGuest = Boolean(user?.isAnonymous);
  const hasCars = Boolean(cars && cars.length > 0);

  // Live client-side mirror of the server schema — drives the disabled state
  // so the submit button is never the thing that reports a 400.
  const inputProblem = useMemo(
    () => (input.trim().length === 0 ? null : validateDiagnoseInput(input, selectedCar)),
    [input, selectedCar],
  );

  const send = useCallback(
    async (text: string) => {
      const symptoms = text.trim();
      if (!symptoms || isLoading) return;

      const invalid = validateDiagnoseInput(symptoms, selectedCar);
      if (invalid) {
        setFailure(invalid);
        return;
      }

      setFailure(null);
      setLastAttempt(symptoms);
      setInput('');
      setTurns((prev) => [
        ...prev,
        { id: nextTurnId(), role: 'user', text: symptoms, at: new Date() },
      ]);

      const outcome = await diagnose(symptoms, selectedCar);

      if (!outcome.ok) {
        setFailure(outcome.failure);
        return;
      }

      setTurns((prev) => [
        ...prev,
        {
          id: nextTurnId(),
          role: 'assistant',
          intro: `Here's what I think is going on with your ${selectedCar?.year} ${selectedCar?.make} ${selectedCar?.model}.`,
          result: outcome.result,
          at: new Date(),
        },
      ]);
    },
    [diagnose, isLoading, selectedCar],
  );

  const handleReset = () => {
    setTurns([]);
    setFailure(null);
    setInput('');
    setLastAttempt(null);
  };

  const showSuggestions = turns.length === 0 && !isLoading;

  // ── Gates ───────────────────────────────────────────────────────────────────

  if (isUserLoading || isLoadingCars) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 h-8 gap-2 bg-primary/5 px-3 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI Mechanic
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Describe the symptom. Get a diagnosis.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Every diagnosis is grounded in the specific car you pick — its make, model, year and
              current mileage — so the answer fits your vehicle, not a generic one.
            </p>
          </div>
          {turns.length > 0 && (
            <Button variant="outline" onClick={handleReset} className="shrink-0 justify-start">
              <RotateCcw className="mr-2 h-4 w-4" />
              New conversation
            </Button>
          )}
        </div>
      </header>

      {isGuest && (
        <Alert>
          <LogIn className="h-4 w-4" />
          <AlertTitle>Sign in to use the AI Mechanic</AlertTitle>
          <AlertDescription>
            Guest mode is browse-only. Create an account so diagnoses can be matched to your saved
            vehicles.
          </AlertDescription>
        </Alert>
      )}

      {!isGuest && !hasCars ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<CarIcon className="h-8 w-8" />}
              title="Add a car to get a diagnosis"
              description="The AI Mechanic needs your car's make, model, year and mileage to tell a normal noise from an expensive one."
              action={
                <Button asChild>
                  <Link href="/dashboard/my-cars/add">Add your first car</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Vehicle context bar */}
          <div className="flex flex-col gap-3 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CarIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Diagnosing
                </p>
                <p className="truncate text-sm font-bold">
                  {selectedCar
                    ? `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}`
                    : 'Select a vehicle'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedCar && (
                <Badge variant="secondary" className="hidden gap-1 sm:flex">
                  <Gauge className="h-3 w-3" />
                  {selectedCar.currentMileage?.toLocaleString() ?? 0} km
                </Badge>
              )}
              <Select value={selectedCarId} onValueChange={setSelectedCarId} disabled={isGuest}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {cars?.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.year} {car.make} {car.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="max-h-[52vh] min-h-[300px] space-y-5 overflow-y-auto p-4 sm:p-5">
            {/* Welcome turn */}
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-4 py-3 text-sm leading-relaxed">
                {WELCOME}
              </div>
            </div>

            {turns.map((turn) =>
              turn.role === 'user' ? (
                <div key={turn.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                    {turn.text}
                  </div>
                </div>
              ) : (
                <div key={turn.id} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="inline-block rounded-2xl rounded-tl-sm border bg-card px-4 py-3 text-sm leading-relaxed">
                      {turn.intro}
                    </div>
                    {turn.result && <DiagnosisCard result={turn.result} />}
                  </div>
                </div>
              ),
            )}

            {isLoading && (
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Working through the symptoms…
                </div>
              </div>
            )}

            {failure && (
              <FailureAlert
                failure={failure}
                onRetry={() => {
                  if (lastAttempt) void send(lastAttempt);
                }}
              />
            )}

            {showSuggestions && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Common issues — tap to start
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      disabled={isGuest || !selectedCar}
                      className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t bg-muted/20 p-4">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="Describe the symptom — when it happens, what it sounds or feels like…"
                  maxLength={1000}
                  disabled={isGuest || isLoading || !selectedCar}
                  className="min-h-[76px] resize-none bg-background"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className={cn(inputProblem && 'text-destructive')}>
                    {inputProblem?.message ?? 'At least 10 characters. Enter to send, Shift+Enter for a new line.'}
                  </span>
                  <span>{input.length}/1000</span>
                </div>
              </div>
              <Button
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full"
                onClick={() => void send(input)}
                disabled={isGuest || isLoading || Boolean(inputProblem) || input.trim().length === 0}
                aria-label="Send symptoms for diagnosis"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
