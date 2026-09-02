import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { asAnonymous, asCustomer, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

describe('Phase 0 fixes still hold under the Phase 1 rules rewrite', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  it('a vendor cannot self-write kyc.status on their own vendor doc', async () => {
    await seedWithoutRules(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'vendors', 'uid_vendor_1'), {
        ownerId: 'uid_vendor_1', name: 'Test Garage', type: 'Garage',
        address: '123 St', city: 'Doha', country: 'QA', phoneNumber: '+97440000000',
        email: 'v@test.qa', status: 'Approved', kyc: { status: 'Pending' },
        createdAt: new Date(), updatedAt: new Date(),
      });
    });
    const ctx = await asCustomer('uid_vendor_1');
    const ref = doc(ctx.firestore(), 'vendors', 'uid_vendor_1');
    await assertFails(updateDoc(ref, { 'kyc.status': 'Verified' }));
  });

  it('unauthenticated reads of the flat reviews collection are allowed (public read)', async () => {
    await seedWithoutRules(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'reviews', 'rev_1'), {
        userId: 'uid_customer_1', businessId: 'biz_a', branchId: 'brn_a1', bookingId: 'bkg_1',
        rating: 5, comment: 'Great service, very professional and quick.',
      });
    });
    const ctx = await asAnonymous();
    const { getDoc } = await import('firebase/firestore');
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'reviews', 'rev_1')));
  });

  it('an unauthenticated user cannot create a review', async () => {
    const ctx = await asAnonymous();
    const ref = collection(ctx.firestore(), 'reviews');
    await assertFails(addDoc(ref, {
      userId: 'anonymous', businessId: 'biz_a', branchId: 'brn_a1', bookingId: 'bkg_1',
      rating: 5, comment: 'Should not be allowed to post this.',
    }));
  });

  it('a signed-in customer CAN create a review for their own booking', async () => {
    const ctx = await asCustomer('uid_customer_1');
    const ref = collection(ctx.firestore(), 'reviews');
    await assertSucceeds(addDoc(ref, {
      userId: 'uid_customer_1', businessId: 'biz_a', branchId: 'brn_a1', bookingId: 'bkg_1',
      rating: 5, comment: 'Great service, very professional and quick.',
    }));
  });
});
