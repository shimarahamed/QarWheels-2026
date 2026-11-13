// Hand-mirror of src/lib/auth/permissions.ts on the web side. Mobile has no
// build-time link to src/ (separate repo), so this is kept in sync by hand —
// same reasoning as mobile/lib/roles.ts and mobile/lib/booking-workflow.ts.
//
// If you change a row in the web matrix, change it here too. Firestore rules
// are what actually enforce this on both platforms; these tables decide what
// the UI offers, so drift shows up as a screen that lets someone try
// something the server then refuses.

import type { MembershipRole } from './roles';

export type VendorSection =
  | 'overview'
  | 'bookings'
  | 'customers'
  | 'services'
  | 'inventory'
  | 'staff'
  | 'messages'
  | 'invoices'
  | 'payouts'
  | 'promotions'
  | 'reviews'
  | 'analytics';

export type AccessLevel = 'none' | 'read' | 'write';

export const PERMISSION_MATRIX: Record<MembershipRole, Record<VendorSection, AccessLevel>> = {
  business_owner: {
    overview: 'write', bookings: 'write', customers: 'write', services: 'write',
    inventory: 'write', staff: 'write', messages: 'write', invoices: 'write',
    payouts: 'write', promotions: 'write', reviews: 'write', analytics: 'write',
  },
  vendor_admin: {
    overview: 'write', bookings: 'write', customers: 'write', services: 'write',
    inventory: 'write', staff: 'write', messages: 'write', invoices: 'write',
    payouts: 'write', promotions: 'write', reviews: 'write', analytics: 'write',
  },
  vendor_manager: {
    overview: 'write', bookings: 'write', customers: 'write', services: 'write',
    inventory: 'write', staff: 'read', messages: 'write', invoices: 'write',
    payouts: 'read', promotions: 'write', reviews: 'write', analytics: 'write',
  },
  vendor_staff: {
    overview: 'read', bookings: 'write', customers: 'read', services: 'none',
    inventory: 'none', staff: 'none', messages: 'write', invoices: 'none',
    payouts: 'none', promotions: 'none', reviews: 'write', analytics: 'none',
  },
  vendor_cashier: {
    overview: 'read', bookings: 'write', customers: 'read', services: 'none',
    inventory: 'none', staff: 'none', messages: 'none', invoices: 'write',
    payouts: 'none', promotions: 'none', reviews: 'none', analytics: 'none',
  },
  vendor_inventory: {
    overview: 'read', bookings: 'none', customers: 'none', services: 'read',
    inventory: 'write', staff: 'none', messages: 'none', invoices: 'none',
    payouts: 'none', promotions: 'none', reviews: 'none', analytics: 'none',
  },
};

export type VendorAction =
  | 'bookings.editCost'
  | 'bookings.markPaid'
  | 'staff.manage'
  | 'reviews.delete'
  | 'payouts.request'
  | 'business.submitKyc';

const VENDOR_ACTIONS: Record<VendorAction, readonly MembershipRole[]> = {
  'bookings.editCost': ['business_owner', 'vendor_admin', 'vendor_manager'],
  'bookings.markPaid': ['business_owner', 'vendor_admin', 'vendor_manager', 'vendor_cashier'],
  'staff.manage': ['business_owner', 'vendor_admin'],
  'reviews.delete': ['business_owner', 'vendor_admin'],
  'payouts.request': ['business_owner', 'vendor_admin'],
  'business.submitKyc': ['business_owner', 'vendor_admin'],
};

/** Roles whose remit is the whole business rather than a set of branches. */
const BUSINESS_WIDE_ROLES: readonly MembershipRole[] = [
  'business_owner',
  'vendor_admin',
  'vendor_manager',
];

export function isBusinessWideRole(role: MembershipRole): boolean {
  return BUSINESS_WIDE_ROLES.includes(role);
}

export function canAccess(
  role: MembershipRole,
  section: VendorSection,
  need: 'read' | 'write' = 'read',
): boolean {
  const level = PERMISSION_MATRIX[role][section];
  return need === 'write' ? level === 'write' : level !== 'none';
}

export function canPerform(role: MembershipRole, action: VendorAction): boolean {
  return VENDOR_ACTIONS[action].includes(role);
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  business_owner: 'Owner',
  vendor_admin: 'Admin',
  vendor_manager: 'Manager',
  vendor_staff: 'Staff',
  vendor_cashier: 'Cashier',
  vendor_inventory: 'Inventory',
};
