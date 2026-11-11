import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';

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

function loadManagedConfig() {
  let config: unknown;
  try {
    config = JSON.parse(process.env.FIREBASE_CONFIG ?? '');
  } catch {
    throw new Error('FIREBASE_CONFIG must be valid JSON in application-default mode');
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('FIREBASE_CONFIG must be a JSON object');
  }
  const { projectId, storageBucket } = config as Record<string, unknown>;
  if (typeof projectId !== 'string' || !projectId.trim()) {
    throw new Error('FIREBASE_CONFIG.projectId is required');
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_CONFIG.projectId must match NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  }
  if (storageBucket !== undefined && (typeof storageBucket !== 'string' || !storageBucket.trim())) {
    throw new Error('FIREBASE_CONFIG.storageBucket must be a nonempty string');
  }
  const publicBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (storageBucket && publicBucket && storageBucket !== publicBucket) {
    throw new Error('FIREBASE_CONFIG.storageBucket must match NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  }
  return { projectId, storageBucket: typeof storageBucket === 'string' ? storageBucket : publicBucket };
}

let app: App | undefined;

function getAdminApp(): App {
  const mode = process.env.FIREBASE_ADMIN_AUTH_MODE || 'service-account';
  if (mode !== 'service-account' && mode !== 'application-default') {
    throw new Error('FIREBASE_ADMIN_AUTH_MODE must be service-account or application-default');
  }
  // Managed credentials are opt-in; validate their target before reusing any SDK app.
  const managedConfig = mode === 'application-default' ? loadManagedConfig() : null;
  const existing = app ?? getApps()[0];
  if (existing) {
    if (managedConfig && (existing.options.projectId !== managedConfig.projectId ||
        (managedConfig.storageBucket && existing.options.storageBucket !== managedConfig.storageBucket))) {
      throw new Error('Existing Firebase Admin app does not match FIREBASE_CONFIG');
    }
    app = existing;
    return app;
  }
  if (managedConfig) {
    app = initializeApp({ ...managedConfig, credential: applicationDefault() });
    return app;
  }
  const serviceAccount = loadServiceAccount();
  app = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return app;
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
