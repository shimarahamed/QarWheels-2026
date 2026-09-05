import { CheckCircle2, XCircle } from 'lucide-react';
import type { BookingStatus } from '@/lib/types';

/**
 * The forward-progress spine of a job card. Declined/Cancelled/NoShow are
 * side-exits from the main flow, not steps on it — they render as a single
 * terminal banner instead of a stepper position, since "step 3 of 6" reads
 * wrong for a booking that never reached step 3.
 */
const FORWARD_STEPS: BookingStatus[] = [
  'Pending',
  'Confirmed',
  'VehicleReceived',
  'InProgress',
  'ReadyForPickup',
  'Completed',
];

const STEP_LABEL: Record<BookingStatus, string> = {
  Pending: 'Requested',
  Confirmed: 'Confirmed',
  VehicleReceived: 'Vehicle in',
  InProgress: 'In progress',
  ReadyForPickup: 'Ready',
  Completed: 'Completed',
  Declined: 'Declined',
  Cancelled: 'Cancelled',
  NoShow: 'No-show',
};

const SIDE_EXIT_COPY: Partial<Record<BookingStatus, string>> = {
  Declined: 'This job was declined and will not proceed.',
  Cancelled: 'This job was cancelled.',
  NoShow: 'The customer did not show up for this booking.',
};

export function JobStatusStepper({ status }: { status: BookingStatus }) {
  const sideExitCopy = SIDE_EXIT_COPY[status];
  if (sideExitCopy) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm font-semibold text-destructive">
        <XCircle className="h-4 w-4 shrink-0" />
        {sideExitCopy}
      </div>
    );
  }

  const currentIndex = FORWARD_STEPS.indexOf(status);

  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {FORWARD_STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === FORWARD_STEPS.length - 1;
        return (
          <div key={step} className="flex shrink-0 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  isDone
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : isCurrent
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                      : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] font-semibold ${
                  isCurrent ? 'text-primary' : isDone ? 'text-emerald-600' : 'text-muted-foreground'
                }`}
              >
                {STEP_LABEL[step]}
              </span>
            </div>
            {!isLast && (
              <div className={`mx-1.5 mb-4 h-0.5 w-8 shrink-0 sm:w-14 ${isDone ? 'bg-emerald-500' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
