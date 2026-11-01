import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BiometricGate } from '@/components/BiometricGate';
import { useAuthContext } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';
import * as Local from 'expo-local-authentication';
import * as Secure from 'expo-secure-store';
import { lockBiometricSession } from '@/lib/biometrics';

jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/session', () => ({ signOutCompletely: jest.fn() }));
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true), isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

const mounted = jest.fn();
function Protected() { mounted(); return <Text>Private account</Text>; }

beforeEach(() => {
  jest.clearAllMocks();
  lockBiometricSession();
  Object.assign(auth, { currentUser: { uid: 'user-a' } });
  jest.mocked(useAuthContext).mockReturnValue({ user: { uid: 'user-a' } } as never);
  jest.mocked(Secure.getItemAsync).mockResolvedValue('user-a');
  jest.mocked(Local.authenticateAsync).mockResolvedValue({ success: true });
});

it('does not mount protected content on cold launch, then unlocks and relocks', async () => {
  render(<BiometricGate><Protected /></BiometricGate>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Unlock QarWheel' })).toBeTruthy());
  expect(mounted).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Unlock QarWheel' }));
  await waitFor(() => expect(screen.getByText('Private account')).toBeTruthy());
  await act(async () => { lockBiometricSession(); });
  expect(screen.queryByText('Private account')).toBeNull();
});

it('fails closed when secure storage cannot be read', async () => {
  jest.mocked(Secure.getItemAsync).mockRejectedValue(new Error('storage error'));
  render(<BiometricGate><Protected /></BiometricGate>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Unlock QarWheel' })).toBeTruthy());
  expect(mounted).not.toHaveBeenCalled();
});

it('allows accounts that have not enrolled after checking storage', async () => {
  jest.mocked(Secure.getItemAsync).mockResolvedValue(null);
  render(<BiometricGate><Protected /></BiometricGate>);
  await waitFor(() => expect(screen.getByText('Private account')).toBeTruthy());
});
