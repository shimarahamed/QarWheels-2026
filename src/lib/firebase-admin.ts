import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

// Service-account credentials, server-only. Never imported from client code —
// files under src/app/api/** and other server-only modules only.
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not configured');
  }
  try {
    return JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
  }
}

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }
  const serviceAccount = loadServiceAccount();
  app = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
  });
  return app;
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
