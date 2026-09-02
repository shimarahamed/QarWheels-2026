import { signOut } from 'firebase/auth';

import { auth } from './firebase';
import { clearPushTokenFromProfile } from './notifications';
import { identifyUser, track } from './observability';
import { useQarWheelStore } from './store';

// ─── Session teardown ────────────────────────────────────────────────────────
// Signing out has to do more than drop the Firebase credential. The persisted
// store holds the previous person's wallet, ledger, saved addresses and — most
// sensitively — uploaded licence and ID documents. On a shared device all of
// that would otherwise be visible to whoever signs in next.

/**
 * Sign the current user out and remove their data from this device.
 *
 * Order matters: detach the push token while we still have a valid credential,
 * otherwise the Firestore write is rejected and the device keeps receiving the
 * previous user's booking notifications.
 */
export async function signOutCompletely(): Promise<void> {
  const uid = auth.currentUser?.uid;

  track('signed_out');

  if (uid) {
    // Best effort — never block sign-out on a network call.
    await clearPushTokenFromProfile(uid).catch(() => {});
  }

  try {
    await signOut(auth);
  } finally {
    // Runs even if signOut throws: leaving personal data behind is worse than
    // an inconsistent auth state, which the auth listener resolves anyway.
    useQarWheelStore.getState().clearPersonalData();
    identifyUser(null);
  }
}
