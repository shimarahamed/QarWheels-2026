/**
 * Recursively deletes all Phase 1 collections (businesses, branches,
 * memberships, bookings, branch_services, branch_inventory,
 * branch_promotions, reviews) plus the legacy vendors collection, so
 * seed-demo.mjs can be re-run against a clean slate.
 *
 * SAFETY: explicit development environment, matching --project and reset
 * confirmation are required before initializing Firebase.
 *
 * Run: npm run seed:reset -- --project <development-project-id> --yes-i-mean-it
 */
import 'dotenv/config';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { assertDevelopmentProject } from './development-project.mjs';

const COLLECTIONS_TO_WIPE = [
  'businesses', 'branches', 'memberships', 'staff_invites',
  'bookings', 'branch_services', 'branch_inventory', 'branch_promotions', 'reviews',
  // Money and chat. These MUST be wiped alongside bookings — a transaction
  // or invoice pointing at a deleted booking, or a conversation pointing at
  // a deleted branch, is worse than no data at all.
  'transactions', 'payouts', 'invoices', 'businesses_private',
  'conversations', 'messages',
  // Audit trail of actions against records that no longer exist.
  'audit_log',
  // Legacy, pre-Phase-1 collection — wiped too so a re-seed starts clean.
  'vendors',
];

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY. Copy .env.example to .env.local first.');
  return JSON.parse(raw);
}

async function main() {
  if (!process.argv.includes('--yes-i-mean-it')) {
    console.error('Refusing to run without --yes-i-mean-it. This deletes ALL data in the collections below:');
    console.error('  ' + COLLECTIONS_TO_WIPE.join(', '));
    process.exit(1);
  }

  const serviceAccount = loadServiceAccount();
  assertDevelopmentProject(process.env, process.argv.slice(2), serviceAccount, true);

  const app = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
  });
  const db = getFirestore(app);

  console.log(`Resetting Firestore project: ${serviceAccount.project_id}\n`);

  for (const name of COLLECTIONS_TO_WIPE) {
    let deleted = 0;
    // Batched recursive delete, 300 docs at a time, including subcollections
    // (relevant for the legacy vendors/{id}/{services,inventory,staff,...}).
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snap = await db.collection(name).limit(300).get();
      if (snap.empty) break;
      for (const doc of snap.docs) {
        await db.recursiveDelete(doc.ref);
        deleted += 1;
      }
    }
    console.log(`  ✓ ${name}: ${deleted} document(s) deleted`);
  }

  console.log('\nDone. Run `npm run seed:demo` to repopulate.\n');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
