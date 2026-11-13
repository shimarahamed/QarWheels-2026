import * as Apple from 'expo-apple-authentication';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { signInWithApple } from '@/lib/appleSignIn';

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(), signInAsync: jest.fn(), formatFullName: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'unique-raw-nonce', digestStringAsync: jest.fn(async () => 'hashed-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
}));
const mockCredential = jest.fn(() => ({ providerId: 'apple.com' }));
jest.mock('firebase/auth', () => ({
  OAuthProvider: jest.fn(() => ({ credential: mockCredential })),
  signInWithCredential: jest.fn(), updateProfile: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Apple.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(signInWithCredential).mockResolvedValue({ user: { displayName: null } } as never);
});

it('binds the hashed Apple nonce to the raw Firebase nonce, accepting a missing name', async () => {
  jest.mocked(Apple.signInAsync).mockResolvedValue({ identityToken: 'identity-token', fullName: null } as never);
  expect(await signInWithApple()).toBe('success');
  expect(Apple.signInAsync).toHaveBeenCalledWith(expect.objectContaining({ nonce: 'hashed-nonce' }));
  expect(OAuthProvider).toHaveBeenCalledWith('apple.com');
  expect(mockCredential).toHaveBeenCalledWith({ idToken: 'identity-token', rawNonce: 'unique-raw-nonce' });
  expect(signInWithCredential).toHaveBeenCalledTimes(1);
  expect(Apple.formatFullName).not.toHaveBeenCalled();
});

it('does not authenticate on cancellation', async () => {
  jest.mocked(Apple.signInAsync).mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
  expect(await signInWithApple()).toBe('cancelled');
  expect(signInWithCredential).not.toHaveBeenCalled();
});

it('rejects credentials without an identity token', async () => {
  jest.mocked(Apple.signInAsync).mockResolvedValue({ identityToken: null } as never);
  await expect(signInWithApple()).rejects.toThrow('identity token');
  expect(signInWithCredential).not.toHaveBeenCalled();
});
