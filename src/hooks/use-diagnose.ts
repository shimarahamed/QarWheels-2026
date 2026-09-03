'use client';

import { useCallback, useState } from 'react';
import { useUser } from '@/firebase';
import { DiagnoseRequestSchema } from '@/lib/schemas';
import type { Car, DiagnoseResult, WithId } from '@/lib/types';

/**
 * Why the failure mode is a discriminated union rather than a bare string:
 * /api/ai/diagnose has three failures the UI must treat differently — a 429
 * daily cap (nothing to retry now), a 401 (re-auth and the same input works),
 * and everything else (retryable). Collapsing them into one message loses the
 * only information the user can act on.
 */
export type DiagnoseFailure =
  | { kind: 'validation'; message: string }
  | { kind: 'rate-limit'; message: string }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'network'; message: string };

export type DiagnoseCar = Pick<Car, 'make' | 'model' | 'year' | 'currentMileage'>;

type DiagnoseOutcome =
  | { ok: true; result: DiagnoseResult }
  | { ok: false; failure: DiagnoseFailure };

/**
 * Client-side mirror of DiagnoseRequestSchema so an under-length symptom
 * description or an incomplete car never costs the user a round trip (or,
 * worse, one of their ten hourly diagnoses) just to come back as a 400.
 */
export function validateDiagnoseInput(
  symptoms: string,
  car: DiagnoseCar | null | undefined,
): DiagnoseFailure | null {
  if (!car) {
    return { kind: 'validation', message: 'Select which car you want diagnosed.' };
  }

  const parsed = DiagnoseRequestSchema.safeParse({
    symptoms: symptoms.trim(),
    carDetails: {
      make: car.make,
      model: car.model,
      year: car.year,
      mileage: car.currentMileage,
    },
  });

  if (parsed.success) return null;

  const fieldErrors = parsed.error.flatten().fieldErrors;
  // A symptoms error is the user's to fix; a carDetails error means their
  // saved vehicle is missing data, which needs a different call to action.
  const symptomsError = fieldErrors.symptoms?.[0];
  if (symptomsError) return { kind: 'validation', message: symptomsError };

  return {
    kind: 'validation',
    message:
      'This vehicle is missing details the diagnosis needs (make, model, year, and mileage). Update it in My Cars and try again.',
  };
}

export function useDiagnose() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const diagnose = useCallback(
    async (symptoms: string, car: DiagnoseCar | WithId<Car> | null): Promise<DiagnoseOutcome> => {
      const invalid = validateDiagnoseInput(symptoms, car);
      if (invalid) return { ok: false, failure: invalid };
      if (!car) return { ok: false, failure: { kind: 'validation', message: 'Select a vehicle.' } };

      setIsLoading(true);
      try {
        // The route authenticates from the `qw-session` cookie, not an
        // Authorization header. That cookie is written by FirebaseProvider on
        // every onIdTokenChanged, and getIdToken() re-fires that listener when
        // the token is close to expiry — so this call is what keeps a
        // long-open tab from getting a spurious 401 an hour after sign-in.
        if (user) {
          try {
            await user.getIdToken();
          } catch {
            // Non-fatal: fall through and let the 401 branch below handle it.
          }
        }

        const response = await fetch('/api/ai/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symptoms: symptoms.trim(),
            carDetails: {
              make: car.make,
              model: car.model,
              year: car.year,
              mileage: car.currentMileage,
            },
          }),
        });

        if (response.status === 429) {
          return {
            ok: false,
            failure: {
              kind: 'rate-limit',
              message:
                "You've reached today's limit for AI diagnoses. The limit resets within the hour — in the meantime you can book a garage inspection.",
            },
          };
        }

        if (response.status === 401) {
          return {
            ok: false,
            failure: {
              kind: 'unauthorized',
              message: 'Your session expired. Sign in again to keep using the AI Mechanic.',
            },
          };
        }

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          return {
            ok: false,
            failure: {
              kind: 'unavailable',
              message: body.error ?? 'The AI Mechanic is unavailable right now. Please try again.',
            },
          };
        }

        const body = (await response.json()) as { data: DiagnoseResult };
        return { ok: true, result: body.data };
      } catch {
        return {
          ok: false,
          failure: {
            kind: 'network',
            message: 'Network error — check your connection and try again.',
          },
        };
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  return { diagnose, isLoading };
}
