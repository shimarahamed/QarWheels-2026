export type BookingWorkflowStatus =
  | 'Pending'
  | 'Confirmed'
  | 'VehicleReceived'
  | 'InProgress'
  | 'ReadyForPickup'
  | 'Completed'
  | 'Cancelled';

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

export const STATUS_FLOW: BookingWorkflowStatus[] = BOOKING_WORKFLOW.map((step) => step.status);

export function getBookingStatusStep(status: BookingWorkflowStatus): BookingWorkflowStep {
  return BOOKING_WORKFLOW.find((step) => step.status === status) ?? CANCELLATION_STEP;
}

export function getBookingStatusLabel(status: BookingWorkflowStatus): string {
  return getBookingStatusStep(status).label;
}

export function getBookingStatusDescription(status: BookingWorkflowStatus): string {
  return getBookingStatusStep(status).description;
}

export function getBookingStatusIndex(status: BookingWorkflowStatus): number {
  if (status === 'Cancelled') return -1;
  return STATUS_FLOW.indexOf(status);
}

export function isBookingTerminal(status: BookingWorkflowStatus): boolean {
  return status === 'Completed' || status === 'Cancelled';
}
