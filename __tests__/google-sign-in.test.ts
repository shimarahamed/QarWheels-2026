import { act, cleanup, renderHook } from '@testing-library/react-native';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { signInWithCredential } from 'firebase/auth';
import { useGoogleSignIn } from '@/lib/useGoogleSignIn';

jest.mock('expo-auth-session', () => ({ makeRedirectUri: () => 'qarwheel://', exchangeCodeAsync: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({ useAuthRequest: jest.fn(), discovery: {} }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), dismissAuthSession: jest.fn() }));
jest.mock('firebase/auth', () => ({ GoogleAuthProvider: { credential: jest.fn(() => 'credential') }, signInWithCredential: jest.fn() }));
const prompt = jest.fn();
const request = { clientId: 'test-client', redirectUri: 'qarwheel://', scopes: ['openid'], codeVerifier: 'test-verifier' };
const configured = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-client';
  jest.mocked(Google.useAuthRequest).mockReturnValue([request, null, prompt] as never);
  prompt.mockResolvedValue({ type: 'success', params: { id_token: 'test-token' } });
  jest.mocked(signInWithCredential).mockResolvedValue({ user: {} } as never);
});
afterEach(async () => { await cleanup(); jest.useRealTimers(); });
afterAll(() => {
  if (configured === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = configured;
});

it('waits for Firebase and the routing callback before resolving success', async () => {
  const exchange = deferred<never>();
  const route = deferred<void>();
  jest.mocked(signInWithCredential).mockReturnValue(exchange.promise);
  const callback = jest.fn(() => route.promise);
  const { result } = await renderHook(() => useGoogleSignIn());
  let pending!: Promise<string>;
  await act(async () => { pending = result.current.signIn(callback); });
  expect(result.current.loading).toBe(true);
  expect(callback).not.toHaveBeenCalled();
  await act(async () => exchange.resolve({ user: {} } as never));
  expect(callback).toHaveBeenCalledTimes(1);
  expect(result.current.loading).toBe(true);
  await act(async () => route.resolve());
  await expect(pending).resolves.toBe('success');
  expect(result.current.loading).toBe(false);
});

it('shares the in-flight lock across mounted screens', async () => {
  const opening = deferred<unknown>(); prompt.mockReturnValue(opening.promise);
  const first = await renderHook(() => useGoogleSignIn());
  const second = await renderHook(() => useGoogleSignIn());
  let pending!: Promise<string>;
  await act(() => { pending = first.result.current.signIn(); });
  await expect(second.result.current.signIn()).resolves.toBe('cancelled');
  expect(prompt).toHaveBeenCalledTimes(1);
  await act(async () => opening.resolve({ type: 'cancel' }));
  await expect(pending).resolves.toBe('cancelled');
});

it.each(['cancel', 'dismiss', 'error'])('handles a %s prompt without exchanging credentials', async (type) => {
  prompt.mockResolvedValue({ type });
  const { result } = await renderHook(() => useGoogleSignIn());
  await act(async () => { expect(await result.current.signIn()).toBe(type === 'error' ? 'error' : 'cancelled'); });
  expect(signInWithCredential).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
});

it('exchanges native authorization codes with the original PKCE verifier', async () => {
  prompt.mockResolvedValue({ type: 'success', params: { code: 'auth-code' } });
  jest.mocked(AuthSession.exchangeCodeAsync).mockResolvedValue({ idToken: 'test-token' } as never);
  const { result } = await renderHook(() => useGoogleSignIn());
  await act(async () => { expect(await result.current.signIn()).toBe('success'); });
  expect(AuthSession.exchangeCodeAsync).toHaveBeenCalledWith(expect.objectContaining({ code: 'auth-code', extraParams: { code_verifier: 'test-verifier' } }), Google.discovery);
  expect(signInWithCredential).toHaveBeenCalledTimes(1);
});

it('returns Firebase failures and unlocks retry without navigating', async () => {
  jest.mocked(signInWithCredential).mockRejectedValue(new Error('offline'));
  const callback = jest.fn();
  const { result } = await renderHook(() => useGoogleSignIn());
  await act(async () => { expect(await result.current.signIn(callback)).toBe('error'); });
  expect(callback).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
});

it('cancels on unmount and ignores a late prompt result', async () => {
  const opening = deferred<unknown>(); prompt.mockReturnValue(opening.promise);
  const { result, unmount } = await renderHook(() => useGoogleSignIn());
  let pending!: Promise<string>;
  await act(() => { pending = result.current.signIn(); });
  await unmount();
  await expect(pending).resolves.toBe('cancelled');
  await act(async () => opening.resolve({ type: 'success', params: { id_token: 'late-token' } }));
  expect(signInWithCredential).not.toHaveBeenCalled();
  expect(WebBrowser.dismissAuthSession).toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('times out an abandoned prompt and allows retry', async () => {
  prompt.mockReturnValue(new Promise(() => {}));
  const { result } = await renderHook(() => useGoogleSignIn());
  let pending!: Promise<string>;
  await act(() => { pending = result.current.signIn(); });
  await act(async () => jest.advanceTimersByTime(120_000));
  await expect(pending).resolves.toBe('error');
  expect(result.current.loading).toBe(false);
});
