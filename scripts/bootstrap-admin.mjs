/**
 * bootstrap-admin.mjs — creates the FIRST super-admin.
 *
 * roles_admin is `allow write: if false` in firestore.rules, and
 * /api/admin/admins requires an existing super-admin to invite another one.
 * That's deliberate: no client can ever grant itself admin. This script is
 * the one out-of-band path, run manually with a service account, to break
 * that chicken-and-egg for the very first admin. Every subsequent admin
 * should be added through the admin dashboard UI instead.
 *
 * Run: node --env-file=.env.local scripts/bootstrap-admin.mjs <email>
 */
import 'dotenv/config';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node --env-file=.env.local scripts/bootstrap-admin.mjs <email>');
  process.exit(1);
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY. Copy .env.example to .env.local first.');
  return JSON.parse(raw);
}

const serviceAccount = loadServiceAccount();
const app = initializeApp({
  credential: cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
  }),
});
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  console.log(`\nBootstrapping super-admin on project: ${serviceAccount.project_id}\n`);

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`  ✓ found existing account: ${email} (${user.uid})`);
  } catch {
    console.error(`  ✗ No Firebase Auth account exists for ${email}.`);
    console.error('    Sign up through the app first, then re-run this script.');
    process.exit(1);
  }

  const existing = await db.collection('roles_admin').where('level', '==', 'super').get();
  if (!existing.empty) {
    const names = existing.docs.map((d) => d.data().email).join(', ');
    console.warn(`  ! A super-admin already exists (${names}).`);
    console.warn('    Add further admins through the admin dashboard rather than this script.');
    console.warn('    Continuing anyway — this will grant a second super-admin.\n');
  }

  const now = new Date().toISOString();
  await db.collection('roles_admin').doc(user.uid).set({
    uid: user.uid,
    email,
    displayName: user.displayName ?? email,
    level: 'super',
    createdBy: 'bootstrap-script',
    createdAt: now,
  });

  await auth.setCustomUserClaims(user.uid, { qw: { r: 'master_admin', lvl: 'super' } });
  await db.collection('users').doc(user.uid).set({ claimsRefreshedAt: now }, { merge: true });

  console.log(`  ✓ ${email} is now a super-admin`);
  console.log('\n  They must sign out and back in (or wait for a token refresh) for the claim to take effect.\n');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
