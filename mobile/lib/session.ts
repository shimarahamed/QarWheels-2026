import { signOut } from 'firebase/auth';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { auth } from './firebase';
import { clearPushTokenFromProfile } from './notifications';
import { identifyUser, track } from './observability';
import { useQarWheelStore } from './store';
import { disableBiometricUnlock } from './biometrics';

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
  const vaultDocuments = useQarWheelStore.getState().documents;

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
    if (Platform.OS !== 'web') {
      try {
        const ownedPrefix = new File(Paths.document, 'qarwheel-vault-').uri;
        for (const document of vaultDocuments) {
          const suffix = document.uri.startsWith(ownedPrefix) ? document.uri.slice(ownedPrefix.length) : '';
          if (!/^[0-9a-f-]{36}\.[a-z0-9+_-]{1,32}$/i.test(suffix)) continue;
          try {
            const file = new File(document.uri);
            if (file.exists) file.delete();
          } catch { /* continue clearing the account even if a local file is already missing */ }
        }
      } catch { /* native storage failure must not leave the signed-out account visible */ }
    }
    useQarWheelStore.getState().clearPersonalData();
    await disableBiometricUnlock().catch(() => {});
    identifyUser(null);
  }
}
