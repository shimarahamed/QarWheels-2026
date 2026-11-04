import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { claimPayoutTransactions } from '../../src/lib/payout-claims';
import { createInvoiceOnce } from '../../src/lib/invoice-creation';
import type { Invoice, Payout } from '../../src/lib/types';
import { getTestEnv, teardownTestEnv } from './setup';

const app = initializeApp({ projectId: 'demo-no-project' }, 'payout-concurrency');
const db = getFirestore(app);
const now = new Date().toISOString();
const payout: Payout = {
  businessId: 'business_a', periodStart: now, periodEnd: now, grossMinorUnits: 20000,
  platformFeeMinorUnits: 2000, netMinorUnits: 18000, currency: 'QAR', status: 'Processing',
  transactionIds: ['settled_1'], requestedAt: now, requestedBy: 'owner', createdAt: now, updatedAt: now,
};
const invoice: Omit<Invoice, 'invoiceNumber'> = {
  businessId: 'business_a', branchId: 'branch_a', bookingId: 'booking_a', userId: 'customer',
  customerName: 'Customer', customerEmail: 'customer@example.com', lineItems: [],
  subtotalMinorUnits: 10000, taxMinorUnits: 0, totalMinorUnits: 10000, currency: 'QAR',
  status: 'Sent', issuedAt: now, createdAt: now, updatedAt: now,
};

describe('payout reservation', () => {
  beforeEach(async () => {
    await (await getTestEnv()).clearFirestore();
    await db.doc('transactions/settled_1').set({
      businessId: 'business_a', status: 'Settled', grossMinorUnits: 20000,
      commissionMinorUnits: 2000, netMinorUnits: 18000,
    });
  });
  afterAll(async () => { await db.terminate(); await deleteApp(app); await teardownTestEnv(); });

  it('allows exactly one concurrent payout to claim a settled transaction', async () => {
    const results = await Promise.allSettled([
      claimPayoutTransactions(db, db.doc('payouts/first'), payout),
      claimPayoutTransactions(db, db.doc('payouts/second'), payout),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const payouts = await db.collection('payouts').get();
    expect(payouts.size).toBe(1);
    expect((await db.doc('transactions/settled_1').get()).get('payoutId')).toBe(payouts.docs[0].id);
  });

  it('rejects transactions owned by another business', async () => {
    await expect(claimPayoutTransactions(db, db.doc('payouts/foreign'), {
      ...payout, businessId: 'business_b',
    })).rejects.toThrow('PAYOUT_ALREADY_CLAIMED');
    expect((await db.collection('payouts').get()).empty).toBe(true);
  });

  it('creates one invoice when two requests target the same booking', async () => {
    const results = await Promise.allSettled([createInvoiceOnce(db, invoice), createInvoiceOnce(db, invoice)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db.collection('invoices').get()).size).toBe(1);
  });

  it('allocates distinct invoice numbers for concurrent bookings', async () => {
    const results = await Promise.all([
      createInvoiceOnce(db, invoice), createInvoiceOnce(db, { ...invoice, bookingId: 'booking_b' }),
    ]);
    expect(new Set(results.map((result) => result.invoiceNumber)).size).toBe(2);
  });
});
