import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';

const PERSIST_KEY = '@qarwheels/was_authenticated';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  // True if the user was authenticated in a previous session (read from AsyncStorage
  // synchronously before Firebase rehydrates — used by AuthGuard to avoid flash-to-splash)
  wasAuthenticated: boolean;
};

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, wasAuthenticated: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                     = useState<User | null>(null);
  const [loading, setLoading]               = useState(true);
  const [wasAuthenticated, setWasAuth]      = useState(false);
  // Track whether we've loaded the persisted flag yet
  const persistedFlagLoaded                 = useRef(false);

  // Step 1: synchronously read the persisted "was logged in" flag from AsyncStorage.
  // This runs before the Firebase listener fires so AuthGuard doesn't redirect to
  // splash during the brief window where loading=false but user=null.
  useEffect(() => {
    AsyncStorage.getItem(PERSIST_KEY).then((val) => {
      if (val === 'true') setWasAuth(true);
      persistedFlagLoaded.current = true;
    }).catch(() => {
      persistedFlagLoaded.current = true;
    });
  }, []);

  // Step 2: subscribe to Firebase auth state changes.
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // Persist the flag so next cold-start / remount knows user was logged in
      if (u) {
        setWasAuth(true);
        AsyncStorage.setItem(PERSIST_KEY, 'true').catch(() => {});
      } else {
        setWasAuth(false);
        AsyncStorage.removeItem(PERSIST_KEY).catch(() => {});
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, wasAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
