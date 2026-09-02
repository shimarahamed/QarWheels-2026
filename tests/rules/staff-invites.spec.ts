import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { asCustomer, asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

const BIZ_A = 'biz_aab_auto';
const BRANCH_A1 = 'brn_aab_industrial';

describe('Phase 2 staff invite / membership isolation', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
    await seedWithoutRules(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'memberships', 'uid_owner_a_biz_aab_auto'), {
        userId: 'uid_owner_a', businessId: BIZ_A, role: 'business_owner',
        branchIds: [], status: 'Active', email: 'owner@aab.qa', displayName: 'Owner',
        invitedBy: 'uid_owner_a', invitedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
      });
      await setDoc(doc(ctx.firestore(), 'staff_invites', 'inv_1'), {
        businessId: BIZ_A, branchIds: [BRANCH_A1], email: 'newstaff@aab.qa',
        role: 'branch_staff', tokenHash: 'deadbeef', status: 'Pending',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdBy: 'uid_owner_a', createdAt: new Date(),
      });
    });
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  it('no client (not even the business owner) can read a staff_invites document directly', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(getDoc(doc(ctx.firestore(), 'staff_invites', 'inv_1')));
  });

  it('no client can create a staff_invites document directly (must go through /api/vendor/staff/invite)', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(setDoc(doc(ctx.firestore(), 'staff_invites', 'inv_fake'), {
      businessId: BIZ_A, branchIds: [BRANCH_A1], email: 'x@aab.qa', role: 'branch_staff',
      tokenHash: 'x', status: 'Pending', expiresAt: new Date().toISOString(),
      createdBy: 'uid_owner_a', createdAt: new Date(),
    }));
  });

  it('a business owner can read their own membership document', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'memberships', 'uid_owner_a_biz_aab_auto')));
  });

  it('a plain customer cannot read any membership document', async () => {
    const ctx = await asCustomer('uid_random_customer');
    await assertFails(getDoc(doc(ctx.firestore(), 'memberships', 'uid_owner_a_biz_aab_auto')));
  });

  it('no client can update a membership directly — even the owner — role escalation must go through the API', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(updateDoc(doc(ctx.firestore(), 'memberships', 'uid_owner_a_biz_aab_auto'), {
      role: 'master_admin',
    }));
  });

  it('no client can delete a membership directly (revoke must go through the API route)', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(deleteDoc(doc(ctx.firestore(), 'memberships', 'uid_owner_a_biz_aab_auto')));
  });

  it('a business_admin from a DIFFERENT business cannot read business A staff_invites or memberships', async () => {
    const ctx = await asUserWithClaims('uid_owner_b', { r: 'business_owner', b: 'biz_other', br: [] });
    await assertFails(getDoc(doc(ctx.firestore(), 'memberships', 'uid_owner_a_biz_aab_auto')));
    await assertFails(getDoc(doc(ctx.firestore(), 'staff_invites', 'inv_1')));
  });
});
