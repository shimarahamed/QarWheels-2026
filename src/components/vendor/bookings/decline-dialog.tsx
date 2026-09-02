'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const DECLINE_REASONS = [
  'Fully booked',
  'Service not offered',
  'Vehicle not supported',
  'Other',
] as const;

export function DeclineDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isSubmitting: boolean;
}) {
  const [selected, setSelected] = useState<(typeof DECLINE_REASONS)[number]>('Fully booked');
  const [customReason, setCustomReason] = useState('');

  const reason = selected === 'Other' ? customReason.trim() : selected;
  const canSubmit = reason.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline this booking</DialogTitle>
          <DialogDescription>Let the customer know why — this is shown on their booking detail.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-2">
            {DECLINE_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelected(r)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selected === r
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border bg-background text-muted-foreground hover:border-destructive/40'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {selected === 'Other' && (
            <Textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Tell the customer why you can't take this booking…"
              rows={3}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit || isSubmitting}
            onClick={() => onConfirm(reason)}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Decline booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
