import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

describe('branch service tenancy', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
    await seedWithoutRules(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'branches', 'branch_a'), { businessId: 'business_a' });
      await setDoc(doc(ctx.firestore(), 'branches', 'branch_b'), { businessId: 'business_b' });
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
});
