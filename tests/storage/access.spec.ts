import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const claims = (role: string) => ({ qw: { r: role, b: 'business_a', br: ['branch_a'] } });

describe('Storage authority checks', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-no-project',
      firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(resolve('firestore.rules'), 'utf8') },
      storage: { host: '127.0.0.1', port: 9199, rules: readFileSync(resolve('storage.rules'), 'utf8') },
    });
  });
  beforeEach(async () => { await env.clearFirestore(); await env.clearStorage(); });
  afterAll(async () => { await env.cleanup(); });

  it('allows the business owner to upload KYC but denies general staff', async () => {
    const owner = env.authenticatedContext('owner', claims('business_owner'));
    const staff = env.authenticatedContext('staff', claims('vendor_staff'));
    const bytes = new Uint8Array([1, 2, 3]);
    await assertSucceeds(owner.storage().ref('kyc/business_a/id.pdf').put(bytes, { contentType: 'application/pdf' }));
    await assertFails(staff.storage().ref('kyc/business_a/id.pdf').getMetadata());
    await assertFails(staff.storage().ref('kyc/business_a/other.pdf').put(bytes, { contentType: 'application/pdf' }));
  });

  it('revokes admin access even while the token still claims master_admin', async () => {
    const owner = env.authenticatedContext('owner', claims('business_owner'));
    await owner.storage().ref('kyc/business_a/id.pdf').put(new Uint8Array([1]), { contentType: 'application/pdf' });
    const admin = env.authenticatedContext('admin', { qw: { r: 'master_admin', lvl: 'super' } });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'roles_admin', 'admin'), { level: 'super' });
    });
    await assertSucceeds(admin.storage().ref('kyc/business_a/id.pdf').getMetadata());
    await env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'roles_admin', 'admin'));
    });
    await assertFails(admin.storage().ref('kyc/business_a/id.pdf').getMetadata());
  });
});
