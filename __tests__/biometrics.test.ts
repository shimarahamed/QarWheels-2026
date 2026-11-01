import * as Local from 'expo-local-authentication';
import * as Secure from 'expo-secure-store';
import { auth } from '@/lib/firebase';
import { disableBiometricUnlock, enableBiometricUnlock, getUnlockedUid, isBiometricUnlockEnabled, lockBiometricSession, unlockWithBiometrics } from '@/lib/biometrics';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(), isEnrolledAsync: jest.fn(), authenticateAsync: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

beforeEach(() => {
  jest.resetAllMocks();
  lockBiometricSession();
  Object.assign(auth, { currentUser: { uid: 'user-a' } });
  jest.mocked(Local.hasHardwareAsync).mockResolvedValue(true);
  jest.mocked(Local.isEnrolledAsync).mockResolvedValue(true);
  jest.mocked(Local.authenticateAsync).mockResolvedValue({ success: true });
});

it('persists enrollment for the authenticated account only', async () => {
  expect(await enableBiometricUnlock()).toEqual({ ok: true });
  expect(Secure.setItemAsync).toHaveBeenCalledWith(expect.any(String), 'user-a');
  expect(getUnlockedUid()).toBe('user-a');
  jest.mocked(Secure.getItemAsync).mockResolvedValue('user-a');
  expect(await isBiometricUnlockEnabled('user-b')).toBe(false);
});

it('never enables biometrics without a Firebase session', async () => {
  Object.assign(auth, { currentUser: null });
  expect(await enableBiometricUnlock()).toEqual({ ok: false, reason: 'disabled' });
  expect(Local.authenticateAsync).not.toHaveBeenCalled();
});

it('leaves the app locked when the user cancels', async () => {
  jest.mocked(Secure.getItemAsync).mockResolvedValue('user-a');
  jest.mocked(Local.authenticateAsync).mockResolvedValue({ success: false, error: 'user_cancel' });
  expect(await unlockWithBiometrics()).toEqual({ ok: false, reason: 'cancelled' });
  expect(getUnlockedUid()).toBeNull();
});

it('rejects account changes during authentication', async () => {
  jest.mocked(Local.authenticateAsync).mockImplementation(async () => {
    Object.assign(auth, { currentUser: { uid: 'user-b' } });
    return { success: true };
  });
  expect(await enableBiometricUnlock()).toEqual({ ok: false, reason: 'disabled' });
  expect(Secure.setItemAsync).not.toHaveBeenCalled();
});

it('clears the in-memory unlock even when storage deletion fails', async () => {
  await enableBiometricUnlock();
  jest.mocked(Secure.deleteItemAsync).mockRejectedValue(new Error('storage unavailable'));
  await expect(disableBiometricUnlock()).rejects.toThrow();
  expect(getUnlockedUid()).toBeNull();
});

it('relocks an enrolled session without removing enrollment', async () => {
  await enableBiometricUnlock();
  lockBiometricSession();
  expect(getUnlockedUid()).toBeNull();
  expect(Secure.deleteItemAsync).not.toHaveBeenCalled();
});
