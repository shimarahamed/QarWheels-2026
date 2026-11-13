import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';
import { signInWithApple } from '@/lib/appleSignIn';
import { unlockWithBiometrics } from '@/lib/biometrics';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockSetVendorAuthenticated = jest.fn();
const mockGoogle = { signIn: jest.fn(), configured: true, ready: true, loading: false };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/store', () => ({
  useQarWheelStore: (select: (state: unknown) => unknown) => select({ setVendorAuthenticated: mockSetVendorAuthenticated }),
}));
jest.mock('@/lib/useGoogleSignIn', () => ({ useGoogleSignIn: () => mockGoogle }));
jest.mock('@/lib/appleSignIn', () => ({ signInWithApple: jest.fn() }));
jest.mock('@/lib/biometrics', () => ({ unlockWithBiometrics: jest.fn() }));
jest.mock('firebase/auth', () => ({ signInWithEmailAndPassword: jest.fn() }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(() => ({})), getDoc: jest.fn() }));
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null, signOut: jest.fn() }, firestore: {} }));

// Only seed the module's configuration check; no real provider or env file is used.
const originalApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'login-test-key';
const LoginScreen: typeof import('../app/(auth)/login').default = require('../app/(auth)/login').default;
if (originalApiKey === undefined) delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
else process.env.EXPO_PUBLIC_FIREBASE_API_KEY = originalApiKey;

const originalPlatform = Platform.OS;
const mockUser = { uid: 'customer-a', getIdTokenResult: jest.fn() };
const vendorClaims = { qw: { r: 'business_owner', b: 'business-a', br: [] } };
const authLabels = ['Sign in', 'Sign in with Apple', 'Sign in with Google', 'Face ID or biometric access'];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function button(name: string) { return screen.getByRole('button', { name }); }

function pressHandler(name: string): () => void | Promise<void> {
  return () => fireEvent.press(button(name));
}

async function fillCredentials(email = 'owner@example.com', password = '  Secret123  ') {
  await fireEvent.changeText(screen.getByLabelText(/^(Email address|Business email)$/), email);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  Object.assign(auth, { currentUser: mockUser });
  mockUser.getIdTokenResult.mockReset().mockResolvedValue({ claims: {} });
  jest.mocked(auth.signOut).mockReset().mockResolvedValue(undefined);
  jest.mocked(signInWithEmailAndPassword).mockReset().mockResolvedValue({ user: mockUser } as never);
  jest.mocked(getDoc).mockReset().mockResolvedValue({ exists: () => true, data: () => ({ kyc: { status: 'Verified' } }) } as never);
  jest.mocked(signInWithApple).mockReset().mockResolvedValue('success');
  jest.mocked(unlockWithBiometrics).mockReset().mockResolvedValue({ ok: true });
  mockGoogle.signIn.mockReset().mockResolvedValue('success');
  Object.assign(mockGoogle, { configured: true, ready: true, loading: false });
});

afterEach(() => {
  jest.restoreAllMocks();
  Platform.OS = originalPlatform;
  Object.assign(auth, { currentUser: null });
});

it.each([
  ['', 'Enter your email address.'],
  ['   ', 'Enter your email address.'],
  ['not-an-email', 'Check the email address and try again.'],
  ['owner @example.com', 'Check the email address and try again.'],
])('validates email %j inline without authenticating', async (email, message) => {
  await render(<LoginScreen />);
  await fillCredentials(email);
  await fireEvent.press(button('Sign in'));
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(screen.getByRole('alert')).toHaveProp('accessibilityLiveRegion', 'polite');
  expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(button('Sign in')).toBeEnabled();
  await fireEvent.changeText(screen.getByLabelText('Email address'), 'owner@example.com');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('validates an empty password inline, including keyboard submission', async () => {
  await render(<LoginScreen />);
  await fillCredentials('owner@example.com', '');
  await fireEvent(screen.getByLabelText('Password'), 'submitEditing');
  expect(screen.getByRole('alert')).toHaveTextContent('Enter your password to sign in.');
  expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Password'), 'secret');
  expect(screen.queryByRole('alert')).toBeNull();
});

it.each(['Vehicle owner', 'Workshop partner'])('submits the trimmed email and exact password for %s', async (role) => {
  mockUser.getIdTokenResult.mockResolvedValue({ claims: role === 'Workshop partner' ? vendorClaims : {} });
  await render(<LoginScreen />);
  await fireEvent.press(button(role));
  await fillCredentials('  owner@example.com  ');
  await fireEvent.press(button('Sign in'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(role === 'Workshop partner' ? '/vendor/dashboard' : '/(tabs)'));
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'owner@example.com', '  Secret123  ');
});

it.each(['short', '   '])('leaves password validity to the backend without modifying %j', async (password) => {
  jest.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/invalid-credential' });
  await render(<LoginScreen />);
  await fillCredentials('owner@example.com', password);
  await fireEvent.press(button('Sign in'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Incorrect email or password.'));
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'owner@example.com', password);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it.each([
  ['auth/invalid-credential', 'Incorrect email or password.'],
  ['auth/wrong-password', 'Incorrect email or password.'],
  ['auth/user-not-found', 'Incorrect email or password.'],
  ['auth/invalid-email', 'Please enter a valid email address.'],
  ['auth/too-many-requests', 'Too many attempts. Please wait a moment and try again.'],
  ['auth/user-disabled', 'This account has been disabled. Contact support.'],
  ['auth/network-request-failed', 'Network error. Check your connection and try again.'],
])('shows %s inline and permits retry', async (code, message) => {
  jest.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({ code });
  await render(<LoginScreen />);
  await fillCredentials();
  await fireEvent.press(button('Sign in'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(message));
  expect(button('Sign in')).toBeEnabled();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  await fireEvent.press(button('Sign in'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
  expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).toBeNull();
});

it('uses a safe fallback for an unknown backend failure', async () => {
  jest.mocked(signInWithEmailAndPassword).mockRejectedValue(null);
  await render(<LoginScreen />);
  await fillCredentials();
  await fireEvent.press(button('Sign in'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sign in failed. Try again.'));
  expect(button('Sign in')).toBeEnabled();
});

it.each(authLabels)('blocks same-tick duplicate and overlapping auth while %s is pending', async (first) => {
  const pending = deferred<void>();
  jest.mocked(signInWithEmailAndPassword).mockImplementation(() => pending.promise.then(() => ({ user: mockUser }) as never));
  jest.mocked(signInWithApple).mockImplementation(() => pending.promise.then(() => 'success'));
  mockGoogle.signIn.mockImplementation(() => pending.promise.then(() => 'success'));
  jest.mocked(unlockWithBiometrics).mockImplementation(() => pending.promise.then(() => ({ ok: true })));
  await render(<LoginScreen />);
  await fillCredentials();
  const handlers = authLabels.map(pressHandler);
  const switchRole = pressHandler('Workshop partner');
  const keyboardSubmit = screen.getByLabelText('Password').props.onSubmitEditing;

  // Exercise every visible auth action while the first request is pending.
  await act(() => {
    handlers[authLabels.indexOf(first)]();
    handlers.forEach((press) => press());
    keyboardSubmit();
    switchRole();
  });
  const providers = [signInWithEmailAndPassword, signInWithApple, mockGoogle.signIn, unlockWithBiometrics];
  providers.forEach((provider, index) => expect(provider).toHaveBeenCalledTimes(authLabels[index] === first ? 1 : 0));
  authLabels.forEach((label) => expect(button(label)).toBeDisabled());
  expect(button('Sign in')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true, busy: true }));
  expect(button('Vehicle owner')).toHaveProp('accessibilityState', expect.objectContaining({ selected: true, disabled: true }));
  expect(button('Workshop partner')).toHaveProp('accessibilityState', expect.objectContaining({ selected: false, disabled: true }));
  expect(screen.getByLabelText('Email address')).toHaveProp('editable', false);
  expect(screen.getByLabelText('Password')).toHaveProp('editable', false);
  await act(async () => { pending.resolve(); });
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(button('Sign in')).toBeEnabled();
});

it('blocks stale navigation and password-visibility callbacks during authentication', async () => {
  const pending = deferred<'cancelled'>();
  jest.mocked(signInWithApple).mockReturnValue(pending.promise);
  await render(<LoginScreen />);
  const start = pressHandler('Sign in with Apple');
  const otherHandlers = ['Go back', 'Forgot password', 'Create account', 'Show password'].map(pressHandler);
  await act(() => { start(); otherHandlers.forEach((press) => press()); });
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  expect(button('Show password')).toBeDisabled();
  await act(async () => { pending.resolve('cancelled'); });
  expect(button('Show password')).toBeEnabled();
});

it('keeps controls locked while the Google hook is completing authentication', async () => {
  mockGoogle.loading = true;
  await render(<LoginScreen />);
  [...authLabels, 'Vehicle owner', 'Workshop partner', 'Go back', 'Forgot password', 'Create account', 'Show password']
    .forEach((label) => expect(button(label)).toBeDisabled());
  expect(screen.getByLabelText('Email address')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));
  expect(screen.getByLabelText('Password')).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));
});

it.each([
  { configured: false, ready: false },
  { configured: true, ready: false },
])('does not prompt Google before configuration/request readiness: %j', async (state) => {
  Object.assign(mockGoogle, state);
  await render(<LoginScreen />);
  expect(button('Sign in with Google')).toBeDisabled();
  await act(async () => { await pressHandler('Sign in with Google')(); });
  expect(mockGoogle.signIn).not.toHaveBeenCalled();
  expect(button('Sign in')).toBeEnabled();
  Object.assign(mockGoogle, { configured: true, ready: true });
  await screen.rerender(<LoginScreen />);
  await fireEvent.press(button('Sign in with Google'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
});

it.each(['ios', 'android', 'web'] as const)('exposes labeled controls appropriate to %s', async (platform) => {
  Platform.OS = platform;
  await render(<LoginScreen />);
  expect(screen.getByLabelText('Email address')).toHaveProp('autoComplete', 'email');
  expect(screen.getByLabelText('Password')).toHaveProp('autoComplete', 'password');
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  await fireEvent.press(button('Show password'));
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', false);
  await fireEvent.press(button('Hide password'));
  expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  expect(Boolean(screen.queryByRole('button', { name: 'Sign in with Apple' }))).toBe(platform === 'ios');
  expect(Boolean(screen.queryByRole('button', { name: 'Face ID or biometric access' }))).toBe(platform !== 'web');
  expect(button('Sign in with Google')).toBeEnabled();
  await fireEvent.press(button('Workshop partner'));
  expect(button('Workshop partner')).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
  expect(screen.getByLabelText('Business email')).toBeTruthy();
  await fireEvent.press(button('Create account'));
  expect(mockRouter.push).toHaveBeenLastCalledWith('/(auth)/role');
  await fireEvent.press(button('Vehicle owner'));
  await fireEvent.press(button('Create account'));
  expect(mockRouter.push).toHaveBeenLastCalledWith('/(auth)/register');
  await fireEvent.press(button('Forgot password'));
  expect(mockRouter.push).toHaveBeenLastCalledWith('/(auth)/forgot-password');
  await fireEvent.press(button('Go back'));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

it.each(['Verified', 'Pending', 'missing'])('preserves partner routing for %s KYC', async (status) => {
  mockUser.getIdTokenResult.mockResolvedValue({ claims: vendorClaims });
  jest.mocked(getDoc).mockResolvedValue({ exists: () => status !== 'missing', data: () => ({ kyc: { status } }) } as never);
  await render(<LoginScreen />);
  await fireEvent.press(button('Workshop partner'));
  await fillCredentials();
  await fireEvent.press(button('Sign in'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(status === 'Verified' ? '/vendor/dashboard' : '/vendor/kyc'));
  expect(doc).toHaveBeenCalledWith(firestore, 'businesses', 'business-a');
  expect(mockSetVendorAuthenticated).toHaveBeenCalledWith(true);
});

it('signs out non-vendor credentials submitted as a partner without granting vendor access', async () => {
  await render(<LoginScreen />);
  await fireEvent.press(button('Workshop partner'));
  await fillCredentials();
  await fireEvent.press(button('Sign in'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/This account does not have vendor access\./));
  expect(auth.signOut).toHaveBeenCalledTimes(1);
  expect(mockSetVendorAuthenticated).not.toHaveBeenCalled();
  expect(getDoc).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(button('Vehicle owner')).toBeEnabled();
});

it('shows a partner business-load error and unlocks the form', async () => {
  mockUser.getIdTokenResult.mockResolvedValue({ claims: vendorClaims });
  jest.mocked(getDoc).mockRejectedValue(new Error('Business details unavailable.'));
  await render(<LoginScreen />);
  await fireEvent.press(button('Workshop partner'));
  await fillCredentials();
  await fireEvent.press(button('Sign in'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Business details unavailable.'));
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(button('Sign in')).toBeEnabled();
});

it.each(authLabels)('uses vendor claims when routing successful %s', async (label) => {
  mockUser.getIdTokenResult.mockResolvedValue({ claims: vendorClaims });
  await render(<LoginScreen />);
  await fillCredentials();
  await fireEvent.press(button(label));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/vendor/dashboard'));
  expect(mockUser.getIdTokenResult).toHaveBeenCalledWith(true);
});

it.each(['Sign in with Apple', 'Sign in with Google', 'Face ID or biometric access'])('does not navigate or alert after cancelling %s', async (label) => {
  jest.mocked(signInWithApple).mockResolvedValue('cancelled');
  mockGoogle.signIn.mockResolvedValue('cancelled');
  jest.mocked(unlockWithBiometrics).mockResolvedValue({ ok: false, reason: 'cancelled' });
  await render(<LoginScreen />);
  await fireEvent.press(button(label));
  await waitFor(() => expect(button('Sign in')).toBeEnabled());
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
});

it.each(['Sign in with Apple', 'Sign in with Google', 'Face ID or biometric access'])('releases the auth guard when %s throws', async (label) => {
  jest.mocked(signInWithApple).mockRejectedValue({ code: 'auth/network-request-failed' });
  mockGoogle.signIn.mockRejectedValue({ code: 'auth/network-request-failed' });
  jest.mocked(unlockWithBiometrics).mockRejectedValue({ code: 'auth/network-request-failed' });
  await render(<LoginScreen />);
  await fireEvent.press(button(label));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(expect.any(String), 'Network error. Check your connection and try again.'));
  expect(button('Sign in')).toBeEnabled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it('does not invent an authenticated session after a provider reports success', async () => {
  Object.assign(auth, { currentUser: null });
  await render(<LoginScreen />);
  await fireEvent.press(button('Sign in with Google'));
  await waitFor(() => expect(button('Sign in')).toBeEnabled());
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockSetVendorAuthenticated).not.toHaveBeenCalled();
});
