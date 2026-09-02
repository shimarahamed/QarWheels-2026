// Mirrors src/lib/types.ts's BookingStatus/BOOKING_TRANSITIONS on the web
// side (mobile has no build-time link to src/, so kept in sync by hand —
// see mobile/lib/roles.ts for the same pattern with claims).
export type BookingWorkflowStatus =
  | 'Pending'
  | 'Confirmed'
  | 'VehicleReceived'
  | 'InProgress'
  | 'ReadyForPickup'
  | 'Completed'
  | 'Declined'
  | 'Cancelled'
  | 'NoShow';

export const BOOKING_TRANSITIONS: Record<BookingWorkflowStatus, BookingWorkflowStatus[]> = {
  Pending: ['Confirmed', 'Declined', 'Cancelled'],
  Confirmed: ['VehicleReceived', 'Cancelled', 'NoShow'],
  VehicleReceived: ['InProgress', 'Cancelled'],
  InProgress: ['ReadyForPickup'],
  ReadyForPickup: ['Completed'],
  Completed: [],
  Declined: [],
  Cancelled: [],
  NoShow: [],
};

export function canTransitionBooking(from: BookingWorkflowStatus, to: BookingWorkflowStatus): boolean {
  return from === to || BOOKING_TRANSITIONS[from].includes(to);
}

export type BookingActorRole = 'customer' | 'branch_staff' | 'business_owner' | 'business_admin' | 'master_admin';

export function actorAllowedTransitions(role: BookingActorRole, from: BookingWorkflowStatus): BookingWorkflowStatus[] {
  if (role === 'customer') {
    return BOOKING_TRANSITIONS[from].includes('Cancelled') ? ['Cancelled'] : [];
  }
  return BOOKING_TRANSITIONS[from];
}

export function nextForwardStatus(from: BookingWorkflowStatus): BookingWorkflowStatus | null {
  const forward = BOOKING_TRANSITIONS[from].filter((s) => s !== 'Cancelled' && s !== 'Declined' && s !== 'NoShow');
  return forward[0] ?? null;
}

export type BookingWorkflowStep = {
  status: BookingWorkflowStatus;
  label: string;
  customerLabel: string;
  vendorLabel: string;
  description: string;
};

export const BOOKING_WORKFLOW: BookingWorkflowStep[] = [
  {
    status: 'Pending',
    label: 'Pending',
    customerLabel: 'Request sent',
    vendorLabel: 'New request',
    description: 'Booking request received and waiting for vendor confirmation.',
  },
  {
    status: 'Confirmed',
    label: 'Confirmed',
    customerLabel: 'Booking confirmed',
    vendorLabel: 'Confirmed',
    description: 'The service slot is confirmed with the customer.',
  },
  {
    status: 'VehicleReceived',
    label: 'Vehicle received',
    customerLabel: 'Vehicle checked in',
    vendorLabel: 'Vehicle received',
    description: 'Vehicle has been received and checked in by the garage.',
  },
  {
    status: 'InProgress',
    label: 'In progress',
    customerLabel: 'Service in progress',
    vendorLabel: 'Work in progress',
    description: 'The garage team is working on the vehicle.',
  },
  {
    status: 'ReadyForPickup',
    label: 'Ready for pickup',
    customerLabel: 'Ready for pickup',
    vendorLabel: 'Ready for pickup',
    description: 'Work is complete and the customer can collect the vehicle.',
  },
  {
    status: 'Completed',
    label: 'Completed',
    customerLabel: 'Completed',
    vendorLabel: 'Completed',
    description: 'Vehicle collected and service completed.',
  },
];

export const CANCELLATION_STEP: BookingWorkflowStep = {
  status: 'Cancelled',
  label: 'Cancelled',
  customerLabel: 'Cancelled',
  vendorLabel: 'Cancelled',
  description: 'Booking has been cancelled.',
};

export const DECLINED_STEP: BookingWorkflowStep = {
  status: 'Declined',
  label: 'Declined',
  customerLabel: 'Declined by garage',
  vendorLabel: 'Declined',
  description: 'The garage was unable to take this booking.',
};

export const NO_SHOW_STEP: BookingWorkflowStep = {
  status: 'NoShow',
  label: 'No-show',
  customerLabel: 'Missed appointment',
  vendorLabel: 'No-show',
  description: 'The customer did not arrive for the confirmed appointment.',
};

const TERMINAL_SIDE_STEPS: Record<'Cancelled' | 'Declined' | 'NoShow', BookingWorkflowStep> = {
  Cancelled: CANCELLATION_STEP,
  Declined: DECLINED_STEP,
  NoShow: NO_SHOW_STEP,
};

export const STATUS_FLOW: BookingWorkflowStatus[] = BOOKING_WORKFLOW.map((step) => step.status);

export function getBookingStatusStep(status: BookingWorkflowStatus): BookingWorkflowStep {
  if (status in TERMINAL_SIDE_STEPS) return TERMINAL_SIDE_STEPS[status as keyof typeof TERMINAL_SIDE_STEPS];
  return BOOKING_WORKFLOW.find((step) => step.status === status) ?? CANCELLATION_STEP;
}

export function getBookingStatusLabel(status: BookingWorkflowStatus): string {
  return getBookingStatusStep(status).label;
}

export function getBookingStatusDescription(status: BookingWorkflowStatus): string {
  return getBookingStatusStep(status).description;
}

export function getBookingStatusIndex(status: BookingWorkflowStatus): number {
  if (status in TERMINAL_SIDE_STEPS) return -1;
  return STATUS_FLOW.indexOf(status);
}

export function isBookingTerminal(status: BookingWorkflowStatus): boolean {
  return status === 'Completed' || status === 'Cancelled' || status === 'Declined' || status === 'NoShow';
}
