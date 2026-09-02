import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type RulesTestContext,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ID = 'qarwheel-rules-test';

let env: RulesTestEnvironment | undefined;

export async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (env) return env;
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
  return env;
}

export async function teardownTestEnv() {
  if (env) {
    await env.cleanup();
    env = undefined;
  }
}

type QwClaims = {
  r: 'business_owner' | 'business_admin' | 'branch_manager' | 'branch_staff' | 'master_admin';
  b?: string;
  br?: string[];
  lvl?: string;
};

/** An authenticated context with no `qw` claim — a plain customer. */
export async function asCustomer(uid: string): Promise<RulesTestContext> {
  const testEnv = await getTestEnv();
  return testEnv.authenticatedContext(uid);
}

/** An authenticated context carrying business/branch/admin claims. */
export async function asUserWithClaims(uid: string, qw: QwClaims): Promise<RulesTestContext> {
  const testEnv = await getTestEnv();
  return testEnv.authenticatedContext(uid, { qw });
}

export async function asAnonymous(): Promise<RulesTestContext> {
  const testEnv = await getTestEnv();
  return testEnv.unauthenticatedContext();
}

/** Seeds documents bypassing all security rules (Admin SDK equivalent). */
export async function seedWithoutRules(fn: (ctx: RulesTestContext) => Promise<void>) {
  const testEnv = await getTestEnv();
  await testEnv.withSecurityRulesDisabled(fn);
}
