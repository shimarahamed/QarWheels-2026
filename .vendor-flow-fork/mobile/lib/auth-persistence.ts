import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Browser Firebase auth keeps its own IndexedDB/localStorage persistence.
export const createPersistentAuth = (app: FirebaseApp) => getAuth(app);
