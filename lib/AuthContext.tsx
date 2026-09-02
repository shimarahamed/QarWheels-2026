import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { type User, onIdTokenChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';
import { readQwClaims, type QwClaims, type QwRole } from './roles';

const PERSIST_KEY = '@qarwheel/was_authenticated';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  // True if the user was authenticated in a previous session (read from AsyncStorage
  // synchronously before Firebase rehydrates — used by AuthGuard to avoid flash-to-splash)
  wasAuthenticated: boolean;
  claims: QwClaims | null;
  role: QwRole;
  // businessId/branchIds are convenience projections of claims — undefined
  // for a plain customer (no qw claim) or master_admin (business-less role).
  businessId: string | null;
  branchIds: string[];
  claimsLoading: boolean;
  /** Forces a fresh ID token fetch — call after accepting a staff invite or registering a business. */
  refreshClaims: () => Promise<void>;
};

const defaultCtx: AuthCtx = {
  user: null,
  loading: true,
  wasAuthenticated: false,
  claims: null,
  role: 'customer',
  businessId: null,
  branchIds: [],
  claimsLoading: true,
  refreshClaims: async () => {},
};

const AuthContext = createContext<AuthCtx>(defaultCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                     = useState<User | null>(null);
  const [loading, setLoading]               = useState(true);
  const [wasAuthenticated, setWasAuth]      = useState(false);
  const [claims, setClaims]                 = useState<QwClaims | null>(null);
  const [claimsLoading, setClaimsLoading]   = useState(true);
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

  // Step 2: subscribe to Firebase ID token changes — onIdTokenChanged (not just
  // onAuthStateChanged) also fires when the token is refreshed with new custom
  // claims, e.g. right after syncClaimsForUser mints an updated `qw` claim.
  useEffect(() => {
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        setWasAuth(true);
        AsyncStorage.setItem(PERSIST_KEY, 'true').catch(() => {});
        try {
          const tokenResult = await u.getIdTokenResult();
          setClaims(readQwClaims(tokenResult.claims));
        } catch {
          setClaims(null);
        }
        setClaimsLoading(false);
      } else {
        setWasAuth(false);
        AsyncStorage.removeItem(PERSIST_KEY).catch(() => {});
        setClaims(null);
        setClaimsLoading(false);
      }
    });
  }, []);

  const refreshClaims = useCallback(async () => {
    if (!auth.currentUser) return;
    // Forces a server round-trip rather than the cached token; onIdTokenChanged
    // then fires again automatically with the refreshed claims.
    await auth.currentUser.getIdToken(true);
  }, []);

  const role: QwRole = claims?.r ?? 'customer';
  const businessId = claims && claims.r !== 'master_admin' ? claims.b : null;
  const branchIds = claims && claims.r !== 'master_admin' ? claims.br : [];

  return (
    <AuthContext.Provider
      value={{ user, loading, wasAuthenticated, claims, role, businessId, branchIds, claimsLoading, refreshClaims }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
