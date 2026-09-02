import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { asCustomer, asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

const BIZ_A = 'biz_aab_auto';
const BRANCH_A1 = 'brn_aab_industrial';

function historyOf(...statuses: string[]) {
  return statuses.map((status, i) => ({
    status, at: new Date(), byUid: i === 0 ? 'uid_customer_1' : 'uid_staff_a1',
    byRole: i === 0 ? 'customer' : 'branch_staff',
  }));
}

async function seedBooking(id: string, status: string, historyLen = 1) {
  await seedWithoutRules(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'bookings', id), {
      userId: 'uid_customer_1', customerName: 'Cust One', customerEmail: 'c1@example.com',
      businessId: BIZ_A, branchId: BRANCH_A1, branchName: 'AAB — Industrial',
      carId: 'car_1', serviceName: 'Oil change', bookingDate: new Date(),
      status, statusHistory: historyOf(...Array(historyLen).fill(status)),
      createdAt: new Date(), updatedAt: new Date(),
    });
  });
}

describe('Phase 1 booking state machine', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  it('mobile-shaped booking create (no cost, minimal fields) is allowed', async () => {
    const ctx = await asCustomer('uid_customer_1');
    const ref = collection(ctx.firestore(), 'bookings');
    await assertSucceeds(addDoc(ref, {
      userId: 'uid_customer_1', customerName: 'Cust One', customerEmail: 'c1@example.com',
      businessId: BIZ_A, branchId: BRANCH_A1, branchName: 'AAB — Industrial',
      carId: 'car_1', serviceName: 'Oil change', bookingDate: new Date(),
      status: 'Pending', statusHistory: [{ status: 'Pending', at: new Date(), byUid: 'uid_customer_1', byRole: 'customer' }],
      createdAt: new Date(), updatedAt: new Date(),
    }));
  });

  it('rejects a booking create that starts at a non-Pending status', async () => {
    const ctx = await asCustomer('uid_customer_1');
    const ref = collection(ctx.firestore(), 'bookings');
    await assertFails(addDoc(ref, {
      userId: 'uid_customer_1', customerName: 'Cust One', customerEmail: 'c1@example.com',
      businessId: BIZ_A, branchId: BRANCH_A1, branchName: 'AAB — Industrial',
      carId: 'car_1', serviceName: 'Oil change', bookingDate: new Date(),
      status: 'Confirmed', statusHistory: [{ status: 'Pending', at: new Date(), byUid: 'uid_customer_1', byRole: 'customer' }],
      createdAt: new Date(), updatedAt: new Date(),
    }));
  });

  it('branch staff CAN accept (Pending -> Confirmed)', async () => {
    await seedBooking('bkg_1', 'Pending');
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const ref = doc(ctx.firestore(), 'bookings', 'bkg_1');
    await assertSucceeds(updateDoc(ref, {
      status: 'Confirmed',
      statusHistory: historyOf('Pending', 'Confirmed'),
      acceptedAt: new Date(), acceptedBy: 'uid_staff_a1', updatedAt: new Date(),
    }));
  });

  it('branch staff CANNOT skip Pending straight to Completed', async () => {
    await seedBooking('bkg_2', 'Pending');
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const ref = doc(ctx.firestore(), 'bookings', 'bkg_2');
    await assertFails(updateDoc(ref, {
      status: 'Completed',
      statusHistory: historyOf('Pending', 'Completed'),
      updatedAt: new Date(),
    }));
  });

  it('branch staff CANNOT move a Completed booking back to InProgress', async () => {
    await seedBooking('bkg_3', 'Completed');
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const ref = doc(ctx.firestore(), 'bookings', 'bkg_3');
    await assertFails(updateDoc(ref, {
      status: 'InProgress',
      statusHistory: historyOf('Completed', 'InProgress'),
      updatedAt: new Date(),
    }));
  });

  it('staff setting Cancelled from Completed is rejected (terminal state)', async () => {
    await seedBooking('bkg_4', 'Completed');
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const ref = doc(ctx.firestore(), 'bookings', 'bkg_4');
    await assertFails(updateDoc(ref, {
      status: 'Cancelled',
      statusHistory: historyOf('Completed', 'Cancelled'),
      updatedAt: new Date(),
    }));
  });

  it('statusHistory must grow by exactly one entry per staff transition', async () => {
    await seedBooking('bkg_5', 'Pending');
    const ctx = await asUserWithClaims('uid_staff_a1', { r: 'branch_staff', b: BIZ_A, br: [BRANCH_A1] });
    const ref = doc(ctx.firestore(), 'bookings', 'bkg_5');
    // Jumps by 2 history entries in one write — rejected even though the
    // status transition itself (Pending -> Confirmed) is legal.
    await assertFails(updateDoc(ref, {
      status: 'Confirmed',
      statusHistory: historyOf('Pending', 'Confirmed', 'VehicleReceived'),
      updatedAt: new Date(),
    }));
  });

  it('customer CAN cancel their own Pending booking', async () => {
    await seedBooking('bkg_6', 'Pending');
    const ctx = await asCustomer('uid_customer_1');
    const ref = doc(ctx.firestore(), 'bookings', 'bkg_6');
    await assertSucceeds(updateDoc(ref, {
      status: 'Cancelled',
      updatedAt: new Date(),
    }));
  });

  it('customer CANNOT cancel a Completed booking', async () => {
    await seedBooking('bkg_7', 'Completed');
    const ctx = await asCustomer('uid_customer_1');
    const ref = doc(ctx.firestore(), 'bookings', 'bkg_7');
    await assertFails(updateDoc(ref, {
      status: 'Cancelled',
      updatedAt: new Date(),
    }));
  });

  it('customer CANNOT set their own booking to Confirmed (only Cancelled is allowed)', async () => {
    await seedBooking('bkg_8', 'Pending');
    const ctx = await asCustomer('uid_customer_1');
    const ref = doc(ctx.firestore(), 'bookings', 'bkg_8');
    await assertFails(updateDoc(ref, {
      status: 'Confirmed',
      updatedAt: new Date(),
    }));
  });
});
