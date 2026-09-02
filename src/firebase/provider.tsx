'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { useRouter, usePathname } from 'next/navigation';
import { readQwClaims, type QwClaims } from '@/lib/auth/qw-claims';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  claims: QwClaims | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
  // Role/tenant claims — see src/lib/auth/claims.ts for how these get minted
  claims: QwClaims | null;
  // Forces a fresh ID token fetch (picks up a just-synced claims change) and
  // re-derives claims/cookie from it. Call after any action that changes the
  // caller's own role (accepting a staff invite, business registration).
  refreshClaims: () => Promise<void>;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { // Renamed from UserAuthHookResult for consistency if desired, or keep as UserAuthHookResult
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  claims: QwClaims | null;
  refreshClaims: () => Promise<void>;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
    claims: null,
  });

  // Effect to subscribe to Firebase auth + ID token changes. onIdTokenChanged
  // (rather than onAuthStateChanged) also fires when the token is refreshed
  // with a new value — e.g. after syncClaimsForUser mints an updated `qw`
  // custom claim — which is what lets refreshClaims() below actually work.
  useEffect(() => {
    if (!auth) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided."), claims: null });
      return;
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          // Set a lightweight session cookie so middleware can guard routes server-side.
          // The actual token is verified by Firebase rules on every Firestore operation.
          let claims: QwClaims | null = null;
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            document.cookie = `qw-session=${tokenResult.token}; path=/; SameSite=Strict; max-age=3600`;
            claims = readQwClaims(tokenResult.claims);
          } catch {
            // Non-fatal — client auth still works via onIdTokenChanged
          }
          setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null, claims });
        } else {
          setUserAuthState({ user: null, isUserLoading: false, userError: null, claims: null });
          // Clear session cookie on logout
          document.cookie = 'qw-session=; path=/; max-age=0';

          const isUserDashboard = pathname.startsWith('/dashboard');
          const isVendorDashboard = pathname.startsWith('/vendor/dashboard');
          if (isUserDashboard) {
            router.replace('/login');
          } else if (isVendorDashboard) {
            router.replace('/vendor/login');
          }
        }
      },
      (error) => {
        console.error('FirebaseProvider: onIdTokenChanged error:', error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error, claims: null });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth, pathname, router]);

  const refreshClaims = useCallback(async () => {
    if (!auth?.currentUser) return;
    // getIdToken(true) forces a fetch from the server rather than the cached
    // token — onIdTokenChanged then fires with the new claims automatically.
    await auth.currentUser.getIdToken(true);
  }, [auth]);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      claims: userAuthState.claims,
      refreshClaims,
    };
  }, [firebaseApp, firestore, auth, userAuthState, refreshClaims]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

/**
 * A safe wrapper around React's useMemo for memoizing Firebase queries and references.
 * Using this ensures that the complex objects created by the Firebase SDK are
 * stable between re-renders, preventing unnecessary re-subscriptions and infinite loops.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { // Renamed from useAuthUser
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  return {
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    claims: context.claims,
    refreshClaims: context.refreshClaims,
  };
};
