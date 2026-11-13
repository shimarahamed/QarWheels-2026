import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { auth } from './firebase';

const BIOMETRIC_ENABLED_KEY = 'qarwheel.biometric-unlock.enabled';
let unlockedUid: string | null = null;
const listeners = new Set<() => void>();
export const getUnlockedUid = () => unlockedUid;
export const subscribeToUnlock = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
function setUnlockedUid(uid: string | null) {
  unlockedUid = uid;
  listeners.forEach((listener) => listener());
}
export const lockBiometricSession = () => setUnlockedUid(null);

export type BiometricResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'not_enrolled' | 'disabled' | 'cancelled' | 'failed' };

export async function isBiometricUnlockEnabled(uid = auth.currentUser?.uid): Promise<boolean> {
  if (Platform.OS === 'web' || !uid) return false;
  return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === uid;
}

async function authenticate(): Promise<BiometricResult> {
  if (Platform.OS === 'web' || !(await LocalAuthentication.hasHardwareAsync())) {
    return { ok: false, reason: 'unsupported' };
  }
  if (!(await LocalAuthentication.isEnrolledAsync())) {
    return { ok: false, reason: 'not_enrolled' };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock QarWheel',
    promptSubtitle: 'Confirm your identity to continue',
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use device passcode',
    biometricsSecurityLevel: 'strong',
  });

  if (result.success) return { ok: true };
  if (result.error === 'user_cancel' || result.error === 'app_cancel' || result.error === 'system_cancel') {
    return { ok: false, reason: 'cancelled' };
  }
  return { ok: false, reason: 'failed' };
}

export async function enableBiometricUnlock(): Promise<BiometricResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false, reason: 'disabled' };
  const result = await authenticate();
  if (auth.currentUser?.uid !== uid) return { ok: false, reason: 'disabled' };
  if (result.ok) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, uid);
    setUnlockedUid(uid);
  }
  return result;
}

export async function disableBiometricUnlock(): Promise<void> {
  try {
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } finally { lockBiometricSession(); }
}

export async function unlockWithBiometrics(): Promise<BiometricResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false, reason: 'disabled' };
  if (!(await isBiometricUnlockEnabled())) return { ok: false, reason: 'disabled' };
  const result = await authenticate();
  if (auth.currentUser?.uid !== uid) return { ok: false, reason: 'disabled' };
  if (result.ok) setUnlockedUid(uid);
  return result;
}
