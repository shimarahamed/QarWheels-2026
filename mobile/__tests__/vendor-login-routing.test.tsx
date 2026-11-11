import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { authRedirect, useSignInNavigation } from '@/lib/auth-navigation';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, Stack: { Screen: () => null } }));
jest.mock('firebase/auth', () => ({ signInWithEmailAndPassword: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));
const originalKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-only';
const VendorLogin: typeof import('../app/(auth)/vendor-login').default = require('../app/(auth)/vendor-login').default;
if (originalKey === undefined) delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
else process.env.EXPO_PUBLIC_FIREBASE_API_KEY = originalKey;
const user = { uid: 'vendor', getIdTokenResult: jest.fn() };
const vendor = { r: 'business_owner', b: 'business', br: [] } as const;
beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(auth, { currentUser: user, signOut: jest.fn(async () => { Object.assign(auth, { currentUser: null }); }) });
  jest.mocked(signInWithEmailAndPassword).mockResolvedValue({ user } as never);
  user.getIdTokenResult.mockResolvedValue({ claims: { qw: vendor } });
  (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ kyc: { status: 'Verified' } }) });
});
afterEach(cleanup);
async function fill() {
  await fireEvent.changeText(screen.getByLabelText('Business email'), 'vendor@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), '  exact password  ');
}

it('keeps invalid vendor credentials on the form with a visible error, never splash', async () => {
  user.getIdTokenResult.mockResolvedValue({ claims: {} });
  await render(<VendorLogin />);
  await fill();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in to dashboard' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/does not have vendor access/));
  expect(auth.signOut).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Sign in to dashboard' })).toBeEnabled();
});
it('locks redirects until KYC resolves and does not let the root replace its destination', async () => {
  let resolve!: (value: unknown) => void;
  (getDoc as jest.Mock).mockReturnValue(new Promise((yes) => { resolve = yes; }));
  const navigation = await renderHook(() => useSignInNavigation());
  await render(<VendorLogin />);
  await fill();
  void fireEvent.press(screen.getByRole('button', { name: 'Sign in to dashboard' }));
  await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1));
  expect(navigation.result.current).toBe('pending');
  const redirectInput = { userId: user.uid, currentUserId: user.uid, claims: { ...vendor, br: [] }, loading: false,
    claimsLoading: false, wasAuthenticated: true, segments: ['(auth)', 'vendor-login'] };
  expect(authRedirect({ ...redirectInput, navigation: navigation.result.current })).toBeNull();
  await act(async () => resolve({ exists: () => true, data: () => ({ kyc: { status: 'Pending' } }) }));
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledWith('/vendor/kyc');
  expect(navigation.result.current).toBe('completed');
  expect(authRedirect({ ...redirectInput, navigation: navigation.result.current })).toBeNull();
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'vendor@example.com', '  exact password  ');
});
it('shows network failures inline and allows a successful retry', async () => {
  jest.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({ code: 'auth/network-request-failed' });
  await render(<VendorLogin />);
  await fill();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in to dashboard' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Network error/));
  expect(mockRouter.replace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in to dashboard' }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/vendor/dashboard'));
});
