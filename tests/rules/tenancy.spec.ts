import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { asCustomer, asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

const BIZ_A = 'biz_aab_auto';
const BIZ_B = 'biz_other_garage';
const BRANCH_A1 = 'brn_aab_industrial';
const BRANCH_A2 = 'brn_aab_west_bay';
const BRANCH_B1 = 'brn_other_main';

async function seedFixtures() {
  await seedWithoutRules(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'businesses', BIZ_A), {
      legalName: 'AAB Auto', displayName: 'AAB Toyota', ownerId: 'uid_owner_a',
      type: 'Garage', status: 'Active', contactEmail: 'a@aab.qa', contactPhone: '+97440000000',
      kyc: { status: 'Verified' }, commissionRateBps: 1000, branchCount: 2,
      createdAt: new Date(), updatedAt: new Date(),
    });
    await setDoc(doc(db, 'businesses', BIZ_B), {
      legalName: 'Other Garage', displayName: 'Other', ownerId: 'uid_owner_b',
      type: 'Garage', status: 'Active', contactEmail: 'b@other.qa', contactPhone: '+97440000001',
      kyc: { status: 'Verified' }, commissionRateBps: 1000, branchCount: 1,
      createdAt: new Date(), updatedAt: new Date(),
    });
    await setDoc(doc(db, 'branches', BRANCH_A1), {
      businessId: BIZ_A, name: 'AAB — Industrial', status: 'Approved', isListed: true,
      address: 'Street 6', city: 'Doha', country: 'QA', latitude: 25.2, longitude: 51.4,
      vacationMode: false, createdAt: new Date(), updatedAt: new Date(),
    });
    await setDoc(doc(db, 'branches', BRANCH_A2), {
      businessId: BIZ_A, name: 'AAB — West Bay', status: 'Approved', isListed: true,
      address: 'West Bay', city: 'Doha', country: 'QA', latitude: 25.3, longitude: 51.5,
      vacationMode: false, createdAt: new Date(), updatedAt: new Date(),
    });
    await setDoc(doc(db, 'branches', BRANCH_B1), {
      businessId: BIZ_B, name: 'Other — Main', status: 'Approved', isListed: true,
      address: 'Main St', city: 'Doha', country: 'QA', latitude: 25.25, longitude: 51.45,
      vacationMode: false, createdAt: new Date(), updatedAt: new Date(),
    });
    await setDoc(doc(db, 'branch_inventory', 'inv_a1_item1'), {
      businessId: BIZ_A, branchId: BRANCH_A1, name: 'Oil filter', sku: 'OF-1',
      quantity: 10, minQuantity: 2, unitPrice: 20,
    });
    await setDoc(doc(db, 'bookings', 'bkg_a1_pending'), {
      userId: 'uid_customer_1', customerName: 'Cust One', customerEmail: 'c1@example.com',
      businessId: BIZ_A, branchId: BRANCH_A1, branchName: 'AAB — Industrial',
      carId: 'car_1', serviceName: 'Oil change', bookingDate: new Date(),
      status: 'Pending', statusHistory: [{ status: 'Pending', at: new Date(), byUid: 'uid_customer_1', byRole: 'customer' }],
      createdAt: new Date(), updatedAt: new Date(),
    });
  });
}

describe('Phase 1 tenancy isolation', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
    await seedFixtures();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  it('staff of branch A1 cannot read branch A2 inventory (same business, different branch)', async () => {
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const otherBranchItem = doc(ctx.firestore(), 'branch_inventory', 'inv_a2_item1');
    // Seed an A2 item to attempt reading
    await seedWithoutRules(async (seedCtx) => {
      await setDoc(doc(seedCtx.firestore(), 'branch_inventory', 'inv_a2_item1'), {
        businessId: BIZ_A, branchId: BRANCH_A2, name: 'Brake pad', sku: 'BP-1',
        quantity: 5, minQuantity: 1, unitPrice: 50,
      });
    });
    await assertFails(getDoc(otherBranchItem));
  });

  it('staff of branch A1 CAN read their own branch inventory', async () => {
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const item = doc(ctx.firestore(), 'branch_inventory', 'inv_a1_item1');
    await assertSucceeds(getDoc(item));
  });

  it('staff of business A cannot read business B at all', async () => {
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const bizB = doc(ctx.firestore(), 'businesses', BIZ_B);
    await assertFails(getDoc(bizB));
  });

  it('a customer cannot read any branch inventory', async () => {
    const ctx = await asCustomer('uid_customer_1');
    const item = doc(ctx.firestore(), 'branch_inventory', 'inv_a1_item1');
    await assertFails(getDoc(item));
  });

  it('business owner CAN read all their branches (implicit all-branch scope)', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    const branchA1 = doc(ctx.firestore(), 'branches', BRANCH_A1);
    const branchA2 = doc(ctx.firestore(), 'branches', BRANCH_A2);
    await assertSucceeds(getDoc(branchA1));
    await assertSucceeds(getDoc(branchA2));
  });

  it('branch_staff of A1 cannot accept a booking on branch A2', async () => {
    await seedWithoutRules(async (seedCtx) => {
      await setDoc(doc(seedCtx.firestore(), 'bookings', 'bkg_a2_pending'), {
        userId: 'uid_customer_2', customerName: 'Cust Two', customerEmail: 'c2@example.com',
        businessId: BIZ_A, branchId: BRANCH_A2, branchName: 'AAB — West Bay',
        carId: 'car_2', serviceName: 'Brake service', bookingDate: new Date(),
        status: 'Pending', statusHistory: [{ status: 'Pending', at: new Date(), byUid: 'uid_customer_2', byRole: 'customer' }],
        createdAt: new Date(), updatedAt: new Date(),
      });
    });
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const bookingRef = doc(ctx.firestore(), 'bookings', 'bkg_a2_pending');
    await assertFails(updateDoc(bookingRef, {
      status: 'Confirmed',
      statusHistory: [
        { status: 'Pending', at: new Date(), byUid: 'uid_customer_2', byRole: 'customer' },
        { status: 'Confirmed', at: new Date(), byUid: 'uid_staff_a1', byRole: 'branch_staff' },
      ],
    }));
  });

  it('master admin can read everything', async () => {
    const ctx = await asUserWithClaims('uid_admin_1', { r: 'master_admin', lvl: 'super' });
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'businesses', BIZ_B)));
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'branch_inventory', 'inv_a1_item1')));
  });

  it('a membership document cannot be written directly by any client', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    const membershipRef = doc(ctx.firestore(), 'memberships', 'uid_new_staff_biz_aab_auto');
    await assertFails(setDoc(membershipRef, {
      userId: 'uid_new_staff', businessId: BIZ_A, role: 'branch_staff',
      branchIds: [BRANCH_A1], status: 'Active', email: 'x@aab.qa', displayName: 'X',
      invitedBy: 'uid_owner_a', invitedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    }));
  });
});
