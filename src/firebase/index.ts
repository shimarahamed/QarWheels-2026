'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Initializes and returns the Firebase app, auth, and firestore instances.
 * Ensures that Firebase is only initialized once.
 */
export function initializeFirebase() {
  const apps = getApps();
  const firebaseApp = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  
  return { firebaseApp, auth, firestore };
}

// Re-exporting all hooks and providers from their respective modules
// to create a single, consistent entry point for all Firebase-related imports.

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './safe-writes';