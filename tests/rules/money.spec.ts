import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { asCustomer, asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

const BIZ_A = 'biz_aab_auto';
const BIZ_B = 'biz_other';
const BRANCH_A1 = 'brn_aab_industrial';

describe('Phase 3 money collections: transactions, payouts, invoices', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
    await seedWithoutRules(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'transactions', 'txn_1'), {
        businessId: BIZ_A, branchId: BRANCH_A1, bookingId: 'bkg_1',
        customerName: 'Walid', serviceName: 'Oil change',
        grossMinorUnits: 38000, commissionMinorUnits: 3800, netMinorUnits: 34200,
        currency: 'QAR', status: 'Settled', createdAt: new Date(),
      });
      await setDoc(doc(db, 'payouts', 'pay_1'), {
        businessId: BIZ_A, periodStart: '2026-01-01', periodEnd: '2026-01-31',
        grossMinorUnits: 38000, platformFeeMinorUnits: 3800, netMinorUnits: 34200,
        currency: 'QAR', status: 'Processing', transactionIds: ['txn_1'],
        requestedAt: new Date(), requestedBy: 'uid_owner_a',
        createdAt: new Date(), updatedAt: new Date(),
      });
      await setDoc(doc(db, 'invoices', 'inv_1'), {
        businessId: BIZ_A, branchId: BRANCH_A1, bookingId: 'bkg_1',
        invoiceNumber: 'INV-2026-0001', userId: 'uid_customer_1',
        customerName: 'Walid', customerEmail: 'walid@example.com',
        lineItems: [{ description: 'Oil change', quantity: 1, unitPriceMinorUnits: 38000 }],
        subtotalMinorUnits: 38000, taxMinorUnits: 0, totalMinorUnits: 38000,
        currency: 'QAR', status: 'Sent', createdAt: new Date(), updatedAt: new Date(),
      });
    });
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  it('a business owner CAN read their own transactions', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'transactions', 'txn_1')));
  });

  it('a business owner CANNOT write a transaction — the ledger is Admin-SDK only', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(addDoc(collection(ctx.firestore(), 'transactions'), {
      businessId: BIZ_A, branchId: BRANCH_A1, bookingId: 'bkg_fake',
      customerName: 'X', serviceName: 'Fake', grossMinorUnits: 999999,
      commissionMinorUnits: 0, netMinorUnits: 999999, currency: 'QAR',
      status: 'Settled', createdAt: new Date(),
    }));
  });

  it('a business owner CANNOT edit a transaction to zero out the platform commission', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(updateDoc(doc(ctx.firestore(), 'transactions', 'txn_1'), {
      commissionMinorUnits: 0, netMinorUnits: 38000,
    }));
  });

  it('a business owner CANNOT create or inflate their own payout', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(addDoc(collection(ctx.firestore(), 'payouts'), {
      businessId: BIZ_A, periodStart: '2026-01-01', periodEnd: '2026-01-31',
      grossMinorUnits: 9999999, platformFeeMinorUnits: 0, netMinorUnits: 9999999,
      currency: 'QAR', status: 'Paid', transactionIds: [],
      requestedAt: new Date(), requestedBy: 'uid_owner_a',
      createdAt: new Date(), updatedAt: new Date(),
    }));
    await assertFails(updateDoc(doc(ctx.firestore(), 'payouts', 'pay_1'), {
      netMinorUnits: 9999999, status: 'Paid',
    }));
  });

  it('a DIFFERENT business cannot read business A transactions or payouts', async () => {
    const ctx = await asUserWithClaims('uid_owner_b', { r: 'business_owner', b: BIZ_B, br: [] });
    await assertFails(getDoc(doc(ctx.firestore(), 'transactions', 'txn_1')));
    await assertFails(getDoc(doc(ctx.firestore(), 'payouts', 'pay_1')));
  });

  it('a plain customer cannot read a business transaction or payout', async () => {
    const ctx = await asCustomer('uid_customer_1');
    await assertFails(getDoc(doc(ctx.firestore(), 'transactions', 'txn_1')));
    await assertFails(getDoc(doc(ctx.firestore(), 'payouts', 'pay_1')));
  });

  it('the customer an invoice is addressed to CAN read it', async () => {
    const ctx = await asCustomer('uid_customer_1');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'invoices', 'inv_1')));
  });

  it('an unrelated customer cannot read someone else’s invoice', async () => {
    const ctx = await asCustomer('uid_other_customer');
    await assertFails(getDoc(doc(ctx.firestore(), 'invoices', 'inv_1')));
  });

  it('nobody can mark an invoice paid from a client', async () => {
    const owner = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(updateDoc(doc(owner.firestore(), 'invoices', 'inv_1'), { status: 'Paid' }));

    const customer = await asCustomer('uid_customer_1');
    await assertFails(updateDoc(doc(customer.firestore(), 'invoices', 'inv_1'), { status: 'Paid' }));
  });
});
