import type { MembershipRole } from '@/lib/types';

/**
 * The vendor permission model, defined once.
 *
 * Everything role-related derives from this file: the API route guards, the
 * dashboard nav, each page's own gate, the staff invite/edit pickers, and
 * (mirrored by hand, see below) the mobile app. Before this existed the role
 * strings were retyped in six places and drifted; if you're adding a role or
 * moving a permission, this is the only file that should need a decision.
 *
 * The one copy that can't import from here is firestore.rules — the rules
 * language has no imports, so it restates this matrix as literal role lists.
 * Those helpers carry a comment pointing back here; when you change a row in
 * PERMISSION_MATRIX, grep firestore.rules for the matching helper. Rules are
 * the real enforcement floor, so a change made here and not there is a UI
 * that hides a button over data the client can still reach.
 *
 * mobile/lib/permissions.ts is a hand-mirror of this file, same as
 * mobile/lib/roles.ts mirrors qw-claims.ts — mobile is a separate repo with
 * no build-time link to src/.
 */

export const VENDOR_ROLES = [
  'business_owner',
  'vendor_admin',
  'vendor_manager',
  'vendor_staff',
  'vendor_cashier',
  'vendor_inventory',
] as const satisfies readonly MembershipRole[];

/**
 * Roles a business can hand out. business_owner is excluded deliberately —
 * it's set once at registration and the invite/edit routes reject it, so a
 * business can't end up with two owners or none.
 */
export const ASSIGNABLE_VENDOR_ROLES = [
  'vendor_admin',
  'vendor_manager',
  'vendor_staff',
  'vendor_cashier',
  'vendor_inventory',
] as const satisfies readonly MembershipRole[];

export type AssignableVendorRole = (typeof ASSIGNABLE_VENDOR_ROLES)[number];

/** The dashboard sections permissions are expressed over. */
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

/** 'write' implies 'read'. 'none' hides the section entirely. */
export type AccessLevel = 'none' | 'read' | 'write';

/**
 * Section-level access per role.
 *
 * Carve-outs finer than a whole section (staff may update a booking's status
 * but not its price; a cashier may mark one paid but not reschedule it) can't
 * be said in one AccessLevel — those live in VENDOR_ACTIONS below, and are
 * checked *in addition* to the section level, never instead of it.
 */
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
  // Runs the day-to-day of the business, but doesn't control who works here
  // or where the money lands — staff and payouts stay read-only.
  vendor_manager: {
    overview: 'write', bookings: 'write', customers: 'write', services: 'write',
    inventory: 'write', staff: 'read', messages: 'write', invoices: 'write',
    payouts: 'read', promotions: 'write', reviews: 'write', analytics: 'write',
  },
  // Works the jobs: moves bookings through the workflow, talks to customers,
  // answers reviews. No pricing, no stock, no money.
  vendor_staff: {
    overview: 'read', bookings: 'write', customers: 'read', services: 'none',
    inventory: 'none', staff: 'none', messages: 'write', invoices: 'none',
    payouts: 'none', promotions: 'none', reviews: 'write', analytics: 'none',
  },
  // Handles billing at the counter: sees the job, takes payment, issues the
  // invoice. Not the workshop side, not the chat.
  vendor_cashier: {
    overview: 'read', bookings: 'write', customers: 'read', services: 'none',
    inventory: 'none', staff: 'none', messages: 'none', invoices: 'write',
    payouts: 'none', promotions: 'none', reviews: 'none', analytics: 'none',
  },
  // Parts and stock only. Services is readable because that's where a part's
  // price is set, and stock decisions depend on it.
  vendor_inventory: {
    overview: 'read', bookings: 'none', customers: 'none', services: 'read',
    inventory: 'write', staff: 'none', messages: 'none', invoices: 'none',
    payouts: 'none', promotions: 'none', reviews: 'none', analytics: 'none',
  },
};

/**
 * Permissions narrower than a section.
 *
 * Each of these sits inside a section the role can already write — they take
 * something back out of that grant, so checking one without also checking the
 * section level would be wrong.
 */
export type VendorAction =
  /** Change what a job costs. Staff and cashiers work the booking; they don't price it. */
  | 'bookings.editCost'
  /** Mark a booking paid / raise its invoice. */
  | 'bookings.markPaid'
  /** Invite, edit, or revoke a colleague. Managers can see the team, not change it. */
  | 'staff.manage'
  /** Remove a review outright, as opposed to replying to it. */
  | 'reviews.delete'
  /** Move money out to the business's bank account. */
  | 'payouts.request'
  /**
   * Submit the business's legal identity and banking details for verification.
   * Deliberately not tied to a dashboard section: it's a company-level act
   * with legal weight, so it stays with the people accountable for the
   * business rather than whoever happens to run a branch.
   */
  | 'business.submitKyc';

const VENDOR_ACTIONS: Record<VendorAction, readonly MembershipRole[]> = {
  'bookings.editCost': ['business_owner', 'vendor_admin', 'vendor_manager'],
  'bookings.markPaid': ['business_owner', 'vendor_admin', 'vendor_manager', 'vendor_cashier'],
  'staff.manage': ['business_owner', 'vendor_admin'],
  'reviews.delete': ['business_owner', 'vendor_admin'],
  'payouts.request': ['business_owner', 'vendor_admin'],
  'business.submitKyc': ['business_owner', 'vendor_admin'],
};

/**
 * Roles whose remit is the whole business rather than a set of branches.
 * These see every branch and get the "All branches" option in the switcher;
 * everyone else is confined to the branchIds on their claim.
 */
const BUSINESS_WIDE_ROLES: readonly MembershipRole[] = [
  'business_owner',
  'vendor_admin',
  'vendor_manager',
];

export function isBusinessWideRole(role: MembershipRole): boolean {
  return BUSINESS_WIDE_ROLES.includes(role);
}

/** Can this role see (or, with need='write', change) this section? */
export function canAccess(
  role: MembershipRole,
  section: VendorSection,
  need: 'read' | 'write' = 'read',
): boolean {
  const level = PERMISSION_MATRIX[role][section];
  return need === 'write' ? level === 'write' : level !== 'none';
}

/** Can this role take this specific action? Check the section too. */
export function canPerform(role: MembershipRole, action: VendorAction): boolean {
  return VENDOR_ACTIONS[action].includes(role);
}

/** What people are called in the UI. */
export const ROLE_LABELS: Record<MembershipRole, string> = {
  business_owner: 'Owner',
  vendor_admin: 'Admin',
  vendor_manager: 'Manager',
  vendor_staff: 'Staff',
  vendor_cashier: 'Cashier',
  vendor_inventory: 'Inventory',
};

/** Shown under each option in the invite picker, so the choice is informed. */
export const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  business_owner: 'Full control, including billing. Set when the business registers.',
  vendor_admin: 'Everything a manager can do, plus managing the team and payouts.',
  vendor_manager: 'Runs the branch day to day. Can see the team but not change it.',
  vendor_staff: 'Works on jobs, messages customers, replies to reviews.',
  vendor_cashier: 'Takes payment and issues invoices.',
  vendor_inventory: 'Manages parts and stock levels.',
};
