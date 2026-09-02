'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, ArrowRight } from 'lucide-react';
import { DeclineDialog } from './decline-dialog';
import { useBookingTransition } from '@/hooks/use-booking-transition';
import { nextForwardStatus, type Booking, type WithId } from '@/lib/types';

/**
 * Inline row actions for the bookings table. On `Pending`, shows Accept /
 * Decline. On any other non-terminal status, shows a single "Mark as {next}"
 * primary — the forward-only set actorAllowedTransitions already computes
 * for staff. Terminal statuses (Completed/Declined/Cancelled/NoShow) render
 * nothing here; the row falls back to the dropdown's full edit dialog.
 */
export function BookingActions({ booking, onChanged }: { booking: WithId<Booking>; onChanged?: () => void }) {
  const { transition, pendingId } = useBookingTransition();
  const [declineOpen, setDeclineOpen] = useState(false);
  const isPending = pendingId === booking.id;

  if (booking.status === 'Pending') {
    return (
      <>
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
            disabled={isPending}
            onClick={async (e) => {
              e.stopPropagation();
              const ok = await transition({ bookingId: booking.id, status: 'Confirmed' });
              if (ok) onChanged?.();
            }}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/8"
            disabled={isPending}
            onClick={(e) => { e.stopPropagation(); setDeclineOpen(true); }}
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </Button>
        </div>
        <DeclineDialog
          open={declineOpen}
          onOpenChange={setDeclineOpen}
          isSubmitting={isPending}
          onConfirm={async (reason) => {
            const ok = await transition({ bookingId: booking.id, status: 'Declined', declinedReason: reason });
            if (ok) { setDeclineOpen(false); onChanged?.(); }
          }}
        />
      </>
    );
  }

  const next = nextForwardStatus(booking.status);
  if (!next) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 px-3 text-xs hover:border-primary/40 hover:text-primary"
      disabled={isPending}
      onClick={async (e) => {
        e.stopPropagation();
        const ok = await transition({ bookingId: booking.id, status: next });
        if (ok) onChanged?.();
      }}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
      Mark as {next}
    </Button>
  );
}
