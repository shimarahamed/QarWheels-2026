import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { asAnonymous, asCustomer, asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

describe('branch service tenancy', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
    await seedWithoutRules(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'branches', 'branch_a'), { businessId: 'business_a', status: 'Approved', isListed: true });
      await setDoc(doc(ctx.firestore(), 'branches', 'branch_b'), { businessId: 'business_b', status: 'Approved', isListed: false });
    });
  });

  afterAll(async () => teardownTestEnv());

  it('permits an own-branch service but rejects a foreign branch and tenant rewrite', async () => {
    const owner = await asUserWithClaims('owner_a', { r: 'business_owner', b: 'business_a', br: [] });
    const own = doc(owner.firestore(), 'branch_services', 'service_a');
    const fields = { businessId: 'business_a', branchId: 'branch_a', name: 'Inspection', price: 100, duration: 30, active: true };
    await assertSucceeds(setDoc(own, fields));
    await assertFails(setDoc(doc(owner.firestore(), 'branch_services', 'forged'), { ...fields, branchId: 'branch_b' }));
    await assertFails(updateDoc(own, { businessId: 'business_b' }));
    await assertFails(updateDoc(own, { branchId: 'branch_b' }));
  });

  it('shows only active services at approved, listed branches to the public', async () => {
    await seedWithoutRules(async (ctx) => {
      const services = collection(ctx.firestore(), 'branch_services');
      await setDoc(doc(services, 'public'), { businessId: 'business_a', branchId: 'branch_a', active: true });
      await setDoc(doc(services, 'draft'), { businessId: 'business_a', branchId: 'branch_a', active: false });
      await setDoc(doc(services, 'hidden'), { businessId: 'business_b', branchId: 'branch_b', active: true });
      await setDoc(doc(ctx.firestore(), 'branches', 'branch_pending'), { businessId: 'business_b', status: 'Pending Approval', isListed: true });
      await setDoc(doc(services, 'pending'), { businessId: 'business_b', branchId: 'branch_pending', active: true });
    });
    const anonymous = await asAnonymous();
    const services = collection(anonymous.firestore(), 'branch_services');
    await assertSucceeds(getDoc(doc(services, 'public')));
    await assertFails(getDoc(doc(services, 'draft')));
    await assertFails(getDoc(doc(services, 'hidden')));
    await assertFails(getDoc(doc(services, 'pending')));
    await assertSucceeds(getDocs(query(services, where('branchId', '==', 'branch_a'), where('active', '==', true))));
    await assertFails(getDocs(query(services, where('branchId', '==', 'branch_a'))));
    await assertFails(getDocs(query(services, where('branchId', '==', 'branch_b'), where('active', '==', true))));

    const owner = await asUserWithClaims('owner_a', { r: 'business_owner', b: 'business_a', br: [] });
    await assertSucceeds(getDoc(doc(owner.firestore(), 'branch_services', 'draft')));
    await assertSucceeds(getDocs(query(collection(owner.firestore(), 'branch_services'), where('businessId', '==', 'business_a'), where('branchId', '==', 'branch_a'))));
    await assertFails(getDoc(doc(owner.firestore(), 'branch_services', 'hidden')));
  });

  it('allows a public catalog batch of ten approved branches', async () => {
    const ids = Array.from({ length: 10 }, (_, i) => `listed_${i}`);
    await seedWithoutRules(async (ctx) => {
      for (const id of ids) {
        await setDoc(doc(ctx.firestore(), 'branches', id), { businessId: 'business_a', status: 'Approved', isListed: true });
        await setDoc(doc(ctx.firestore(), 'branch_services', `service_${id}`), { businessId: 'business_a', branchId: id, active: true });
      }
    });
    const anonymous = await asAnonymous();
    const result = await assertSucceeds(getDocs(query(collection(anonymous.firestore(), 'branch_services'), where('branchId', 'in', ids), where('active', '==', true))));
    if (result.size !== 10) throw new Error(`Expected ten public services, got ${result.size}`);
    const customer = await asCustomer('customer_1');
    const signedInResult = await assertSucceeds(getDocs(query(collection(customer.firestore(), 'branch_services'), where('branchId', 'in', ids), where('active', '==', true))));
    if (signedInResult.size !== 10) throw new Error(`Expected ten signed-in services, got ${signedInResult.size}`);
  });
});
