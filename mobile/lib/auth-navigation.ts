import { useSyncExternalStore } from 'react';
import { isVendorClaims, type QwClaims } from './roles';

type NavigationState = 'idle' | 'pending' | 'completed' | 'failed';
let state: NavigationState = 'idle';
let generation = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => state;
function publish(next: NavigationState) { state = next; listeners.forEach((listener) => listener()); }

/** Keep automatic redirects out of the credential/claims/business-check transaction. */
export function beginSignInNavigation() {
  const attempt = ++generation;
  publish('pending');
  return (routed: boolean) => { if (attempt === generation) publish(routed ? 'completed' : 'failed'); };
}
export function settleSignInNavigation() { if (state === 'completed') publish('idle'); }
export const useSignInNavigation = () => useSyncExternalStore(subscribe, snapshot, snapshot);

const onboarding = new Set(['biometric', 'email-verification', 'location-permission', 'notifications-permission', 'appearance', 'account-success']);
export function authRedirect(input: {
  userId?: string; currentUserId?: string; loading: boolean; claimsLoading: boolean;
  claims: QwClaims | null; segments: readonly string[]; wasAuthenticated: boolean;
  navigation: NavigationState;
}): '/vendor/dashboard' | '/(tabs)' | '/(auth)/login' | '/(auth)/vendor-login' | '/(auth)/splash' | null {
  if (input.loading || input.claimsLoading || input.navigation === 'pending') return null;
  // Firebase may finish sign-in before React commits the corresponding context update.
  if (input.userId !== input.currentUserId) return null;
  const inAuth = input.segments[0] === '(auth)';
  if (input.userId) {
    if (!inAuth || onboarding.has(input.segments[1] ?? '')) return null;
    if (input.navigation !== 'idle' && ['login', 'vendor-login', 'register'].includes(input.segments[1] ?? '')) return null;
    return isVendorClaims(input.claims) ? '/vendor/dashboard' : '/(tabs)';
  }
  if (inAuth && input.segments[1] === 'email-verification') return '/(auth)/login';
  if (inAuth) return null;
  if (input.segments[0] === 'vendor') return '/(auth)/vendor-login';
  return input.wasAuthenticated ? '/(auth)/login' : '/(auth)/splash';
}
