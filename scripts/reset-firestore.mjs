/**
 * Recursively deletes all Phase 1 collections (businesses, branches,
 * memberships, bookings, branch_services, branch_inventory,
 * branch_promotions, reviews) plus the legacy vendors collection, so
 * seed-demo.mjs can be re-run against a clean slate.
 *
 * SAFETY: refuses to run unless --yes-i-mean-it is passed, and refuses to run
 * at all against any project ID listed in PROD_PROJECT_IDS below.
 *
 * Run: node --env-file=.env.local scripts/reset-firestore.mjs --yes-i-mean-it
 */
import 'dotenv/config';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Add real production project IDs here once one exists. This script must
// never be runnable against them, confirmation flag or not.
const PROD_PROJECT_IDS = [];

const COLLECTIONS_TO_WIPE = [
  'businesses', 'branches', 'memberships', 'staff_invites',
  'bookings', 'branch_services', 'branch_inventory', 'branch_promotions', 'reviews',
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
  if (PROD_PROJECT_IDS.includes(serviceAccount.project_id)) {
    console.error(`Refusing to run against ${serviceAccount.project_id} — listed as a production project.`);
    process.exit(1);
  }

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
