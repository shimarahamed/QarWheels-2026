'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { BookingStatus } from '@/lib/types';

type TransitionInput = {
  bookingId: string;
  status: BookingStatus;
  declinedReason?: string;
};

/**
 * Posts to /api/bookings/[bookingId]/transition — the single server-side
 * enforcement point for booking status changes (see that route for why: it
 * atomically writes statusHistory + acceptedAt/declinedReason together,
 * which a plain client-side updateDoc can't do safely). Firestore rules
 * still allow a direct client write as a fallback (so offline mobile keeps
 * working), but every UI action in this app should go through this hook.
 */
export function useBookingTransition() {
  const { user } = useUser();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const transition = useCallback(
    async ({ bookingId, status, declinedReason }: TransitionInput): Promise<boolean> => {
      if (!user) {
        toast({ title: 'Sign in required', variant: 'destructive' });
        return false;
      }
      setPendingId(bookingId);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/bookings/${bookingId}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status, ...(declinedReason ? { declinedReason } : {}) }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Could not update the booking');
        }
        return true;
      } catch (e) {
        toast({
          title: 'Update failed',
          description: e instanceof Error ? e.message : 'Could not update the booking.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [user, toast],
  );

  return { transition, pendingId };
}
