import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createUserWithEmailAndPassword, reload, sendEmailVerification } from 'firebase/auth';
import { Alert } from 'react-native';

import EmailVerificationScreen from '@/app/(auth)/email-verification';
import PhoneOtpScreen from '@/app/(auth)/phone-otp';
import RegisterScreen from '@/app/(auth)/register';
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/lib/firestoreOps';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('firebase/auth', () => ({ createUserWithEmailAndPassword: jest.fn(), reload: jest.fn(), sendEmailVerification: jest.fn() }));
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));
jest.mock('@/lib/firestoreOps', () => ({ createUserProfile: jest.fn() }));

const user = { uid: 'customer-1', emailVerified: false };

beforeEach(() => {
  jest.clearAllMocks();
  user.emailVerified = false;
  Object.assign(auth, { currentUser: user });
  jest.mocked(reload).mockResolvedValue(undefined);
  jest.mocked(sendEmailVerification).mockResolvedValue(undefined);
  jest.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user } as never);
  jest.mocked(createUserProfile).mockResolvedValue(undefined as never);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

it('requires a refreshed verified Firebase user before advancing', async () => {
  await render(<EmailVerificationScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Check verification' }));
  await waitFor(() => expect(screen.getByText(/not verified yet/i)).toBeTruthy());
  expect(reload).toHaveBeenCalledWith(user);
  expect(mockRouter.replace).not.toHaveBeenCalled();

  user.emailVerified = true;
  await fireEvent.press(screen.getByRole('button', { name: 'Check verification' }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/biometric'));
});

it('does not claim an email was sent without a signed-in user', async () => {
  Object.assign(auth, { currentUser: null });
  await render(<EmailVerificationScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Resend email' }));
  expect(sendEmailVerification).not.toHaveBeenCalled();
  expect(screen.getByText('Sign in to request a verification email.')).toBeTruthy();
});

it('registers without a phone OTP and sends a real verification email', async () => {
  await render(<RegisterScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('Ahmad'), 'Aisha');
  await fireEvent.changeText(screen.getByPlaceholderText('Al-Rashid'), 'Saleh');
  await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'aisha@example.com');
  await fireEvent.changeText(screen.getByPlaceholderText('Min. 8 characters'), 'SecurePass1');
  await fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'SecurePass1');
  await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/email-verification'));
  expect(createUserProfile).toHaveBeenCalledWith(user.uid, expect.objectContaining({ phone: undefined }));
  expect(sendEmailVerification).toHaveBeenCalledWith(user);
  expect(mockRouter.push).not.toHaveBeenCalledWith('/(auth)/phone-otp');
});

it('does not offer a fabricated phone-code success path', async () => {
  await render(<PhoneOtpScreen />);
  expect(screen.getByText('Not available yet')).toBeTruthy();
  expect(screen.queryByText('Verify phone')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
  expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
});
