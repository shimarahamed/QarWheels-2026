import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { asCustomer, asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

const quote = {
  revision: 1, status: 'Offered', amountMinorUnits: 12345, currency: 'QAR',
  description: 'Brake repair', offeredAt: '2026-11-01', offeredBy: 'vendor_1',
  requestId: '4e5c190f-b8bb-4e73-9c39-7c1d1c4fed1b',
};
const pending = { status: 'Pending', at: '2026-11-01', byUid: 'customer_1', byRole: 'customer' };
const entry = (status: string, uid = 'vendor_1') => ({ status, at: '2026-11-02', byUid: uid, byRole: 'vendor_manager' });

async function actor(role: string) {
  if (role === 'customer') return asCustomer('customer_1');
  return asUserWithClaims('vendor_1', {
    r: role as 'vendor_manager' | 'vendor_staff' | 'master_admin', b: 'business_1', br: ['branch_1'],
  });
}

async function seed(patch: Record<string, unknown> = {}) {
  await seedWithoutRules(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'bookings', 'booking_1'), {
      userId: 'customer_1', businessId: 'business_1', branchId: 'branch_1',
      status: 'Pending', statusHistory: [pending], requiresQuote: true, quote,
      ...patch,
    });
  });
}

beforeEach(async () => {
  await (await getTestEnv()).clearFirestore();
  await seed();
});
afterAll(teardownTestEnv);

describe('server-owned quote boundary', () => {
  it.each(['customer', 'vendor_staff', 'vendor_manager', 'master_admin'])(
    '%s can read quotes but cannot confirm directly', async (role) => {
      const ctx = await actor(role);
      const ref = doc(ctx.firestore(), 'bookings', 'booking_1');
      await assertSucceeds(getDoc(ref));
      await assertFails(updateDoc(ref, {
        status: 'Confirmed', statusHistory: [pending, entry('Confirmed')],
      }));
      await assertFails(updateDoc(ref, {
        status: 'Confirmed', quote: { ...quote, status: 'Accepted', acceptedBy: 'customer_1' },
        cost: 123.45, statusHistory: [pending, entry('Confirmed')],
      }));
    },
  );

  it.each(['vendor_manager', 'master_admin'])(
    '%s cannot add, replace or delete server-owned fields', async (role) => {
      const ctx = await actor(role);
      const ref = doc(ctx.firestore(), 'bookings', 'booking_1');
      for (const patch of [
        { requiresQuote: false }, { requiresQuote: deleteField() },
        { quote: { ...quote, amountMinorUnits: 0 } }, { quote: deleteField() },
        { 'quote.status': 'Accepted' }, { acceptedAt: 'forged', acceptedBy: 'vendor_1' },
        { cost: 0 }, { receipt: { paid: true } }, { receiptId: 'forged' }, { invoiceId: 'forged' },
      ]) {
        await assertFails(updateDoc(ref, {
          ...patch, status: 'Declined', statusHistory: [pending, entry('Declined')],
        }));
      }
      await assertFails(setDoc(doc(ref, 'quote_requests', quote.requestId), { ...quote }));
      await seedWithoutRules(async (admin) => {
        await setDoc(doc(admin.firestore(), 'bookings/booking_1/quote_requests', quote.requestId), { ...quote });
      });
      await assertFails(updateDoc(doc(ref, 'quote_requests', quote.requestId), { amountMinorUnits: 0 }));
    },
  );

  it.each(['vendor_manager', 'master_admin'])('%s cannot change accepted cost or receipt fields', async (role) => {
    await seed({
      status: 'Confirmed', cost: 123.45, receiptId: 'server_receipt',
      quote: { ...quote, status: 'Accepted', acceptedBy: 'customer_1', acceptedAt: '2026-11-02' },
      acceptedBy: 'customer_1', acceptedAt: '2026-11-02',
    });
    const ctx = await actor(role);
    const ref = doc(ctx.firestore(), 'bookings', 'booking_1');
    for (const patch of [
      { cost: 124 }, { cost: deleteField() }, { receiptId: 'replacement' },
      { receiptId: deleteField() }, { acceptedBy: 'vendor_1' }, { acceptedAt: deleteField() },
    ]) {
      await assertFails(updateDoc(ref, {
        ...patch, status: 'VehicleReceived', statusHistory: [pending, entry('VehicleReceived')],
      }));
    }
    await assertSucceeds(updateDoc(ref, {
      status: 'VehicleReceived', statusHistory: [pending, entry('VehicleReceived')],
    }));
  });

  it('preserves job-card edits on pending and accepted quote bookings', async () => {
    const ctx = await actor('vendor_staff');
    const ref = doc(ctx.firestore(), 'bookings', 'booking_1');
    for (const accepted of [false, true]) {
      await seed(accepted ? {
        status: 'Confirmed', cost: 123.45, quote: { ...quote, status: 'Accepted', acceptedBy: 'customer_1' },
      } : {});
      await assertSucceeds(updateDoc(ref, {
        assignedStaffId: 'tech_1', assignedStaffName: 'Technician',
        partsUsed: [{ name: 'Brake pads', qty: 1, unitPrice: 100, inventoryItemId: 'part_1' }],
        laborEntries: [{ staffId: 'tech_1', minutes: 30 }], photoPaths: ['photo.jpg'],
        notes: 'Inspection finished', updatedAt: '2026-11-02',
      }));
    }
  });

  it('still allows customer cancellation and staff decline before acceptance', async () => {
    const customer = await actor('customer');
    await assertSucceeds(updateDoc(doc(customer.firestore(), 'bookings', 'booking_1'), {
      status: 'Cancelled', statusHistory: [pending, { ...entry('Cancelled', 'customer_1'), byRole: 'customer' }],
    }));
    await seed();
    const staff = await actor('vendor_staff');
    await assertSucceeds(updateDoc(doc(staff.firestore(), 'bookings', 'booking_1'), {
      status: 'Declined', statusHistory: [pending, entry('Declined')], declinedReason: 'Unavailable',
    }));
  });

  it('keeps legacy cost editing and confirmation but rejects adding quote or receipt fields', async () => {
    await seedWithoutRules(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'bookings', 'booking_1'), {
        requiresQuote: deleteField(), quote: deleteField(),
      });
    });
    const manager = await actor('vendor_manager');
    const ref = doc(manager.firestore(), 'bookings', 'booking_1');
    await assertSucceeds(updateDoc(ref, { cost: 125 }));
    await assertSucceeds(updateDoc(ref, { cost: 150 }));
    await assertFails(updateDoc(ref, { requiresQuote: false }));
    await assertFails(updateDoc(ref, { quote }));
    await assertFails(updateDoc(ref, { receiptId: 'forged' }));
    await assertSucceeds(updateDoc(ref, {
      status: 'Confirmed', acceptedAt: '2026-11-02', acceptedBy: 'vendor_1',
      statusHistory: [pending, entry('Confirmed')],
    }));
  });

  it('does not let nonpricing staff add or delete a legacy cost', async () => {
    await seedWithoutRules(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'bookings', 'booking_1'), {
        requiresQuote: deleteField(), quote: deleteField(),
      });
    });
    const staff = await actor('vendor_staff');
    const ref = doc(staff.firestore(), 'bookings', 'booking_1');
    await assertFails(updateDoc(ref, { cost: 100 }));
    await seedWithoutRules(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'bookings', 'booking_1'), { cost: 100 });
    });
    await assertFails(updateDoc(ref, { cost: deleteField() }));
  });
});
