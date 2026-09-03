import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { asCustomer, asUserWithClaims, getTestEnv, seedWithoutRules, teardownTestEnv } from './setup';

const BIZ_A = 'biz_aab_auto';

describe('Phase 4 audit log, admin roles, and private business data', () => {
  beforeEach(async () => {
    const env = await getTestEnv();
    await env.clearFirestore();
    await seedWithoutRules(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'audit_log', 'aud_1'), {
        actorId: 'uid_admin_1', actorRole: 'master_admin', action: 'kyc.approve',
        resourceType: 'business', resourceId: BIZ_A, outcome: 'success', createdAt: new Date(),
      });
      await setDoc(doc(db, 'roles_admin', 'uid_admin_1'), {
        uid: 'uid_admin_1', email: 'ops@qarwheel.qa', displayName: 'Ops', level: 'super',
        createdBy: 'bootstrap-script', createdAt: new Date(),
      });
      await setDoc(doc(db, 'businesses_private', BIZ_A), {
        bankName: 'QNB', iban: 'QA58DOHB00001234567890ABCDEFG', updatedAt: new Date(),
      });
      await setDoc(doc(db, 'businesses', BIZ_A), {
        legalName: 'AAB Auto', displayName: 'AAB Toyota', ownerId: 'uid_owner_a',
        type: 'Garage', status: 'Active', contactEmail: 'a@aab.qa', contactPhone: '+974',
        kyc: { status: 'Pending' }, commissionRateBps: 1000, branchCount: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
    });
  });

  afterAll(async () => {
    await teardownTestEnv();
  });

  it('a master admin CAN read the audit log', async () => {
    const ctx = await asUserWithClaims('uid_admin_1', { r: 'master_admin', lvl: 'super' });
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'audit_log', 'aud_1')));
  });

  it('a business owner CANNOT read the audit log', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(getDoc(doc(ctx.firestore(), 'audit_log', 'aud_1')));
  });

  it('nobody can write an audit log entry from a client — not even a master admin', async () => {
    const ctx = await asUserWithClaims('uid_admin_1', { r: 'master_admin', lvl: 'super' });
    await assertFails(addDoc(collection(ctx.firestore(), 'audit_log'), {
      actorId: 'uid_admin_1', actorRole: 'master_admin', action: 'kyc.approve',
      resourceType: 'business', resourceId: BIZ_A, outcome: 'success', createdAt: new Date(),
    }));
  });

  it('businesses_private is unreadable by the business owner it belongs to', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(getDoc(doc(ctx.firestore(), 'businesses_private', BIZ_A)));
  });

  it('businesses_private is unreadable even by a master admin (Admin SDK only)', async () => {
    const ctx = await asUserWithClaims('uid_admin_1', { r: 'master_admin', lvl: 'super' });
    await assertFails(getDoc(doc(ctx.firestore(), 'businesses_private', BIZ_A)));
  });

  it('nobody can write roles_admin from a client — admin grants go through the API/bootstrap script', async () => {
    const ctx = await asUserWithClaims('uid_admin_1', { r: 'master_admin', lvl: 'super' });
    await assertFails(setDoc(doc(ctx.firestore(), 'roles_admin', 'uid_attacker'), {
      uid: 'uid_attacker', email: 'x@x.com', displayName: 'X', level: 'super',
      createdBy: 'self', createdAt: new Date(),
    }));
  });

  it('a plain customer cannot self-grant admin by writing roles_admin', async () => {
    const ctx = await asCustomer('uid_attacker');
    await assertFails(setDoc(doc(ctx.firestore(), 'roles_admin', 'uid_attacker'), {
      uid: 'uid_attacker', email: 'x@x.com', displayName: 'X', level: 'super',
      createdBy: 'self', createdAt: new Date(),
    }));
  });

  it('a business owner still cannot write their own kyc.status (Phase 0 fix holds)', async () => {
    const ctx = await asUserWithClaims('uid_owner_a', { r: 'business_owner', b: BIZ_A, br: [] });
    await assertFails(updateDoc(doc(ctx.firestore(), 'businesses', BIZ_A), {
      'kyc.status': 'Verified',
    }));
  });
});
