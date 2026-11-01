import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';

export function createPersistentAuth(app: FirebaseApp): FirebaseAuth.Auth {
  // The native export exists at runtime but is absent from browser declarations.
  const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence(storage: typeof AsyncStorage): FirebaseAuth.Persistence;
  };
  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') return FirebaseAuth.getAuth(app);
    throw error;
  }
}
