import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

const dryRun = !process.argv.includes('--write');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  throw new Error('Missing Firebase env vars.');
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  const vendors = await getDocs(collection(db, 'vendors'));
  const changes = [];

  vendors.forEach((snapshot) => {
    const vendor = snapshot.data();
    if (!vendor.ownerId || snapshot.id === vendor.ownerId) return;
    changes.push({ from: snapshot.id, to: vendor.ownerId, data: vendor });
  });

  console.log(`Found ${changes.length} vendor docs to normalize.`);
  for (const change of changes) {
    console.log(`${dryRun ? '[dry-run]' : '[write]'} vendors/${change.from} -> vendors/${change.to}`);
  }

  if (dryRun || changes.length === 0) return;

  const batch = writeBatch(db);
  for (const change of changes) {
    batch.set(doc(db, 'vendors', change.to), change.data, { merge: true });
  }
  await batch.commit();
  console.log('Migration complete. Old vendor docs were left in place for manual review.');
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
