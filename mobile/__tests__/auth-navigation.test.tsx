import { act, cleanup, render, renderHook } from '@testing-library/react-native';
import SplashScreen from '@/app/(auth)/splash';
import { authRedirect, beginSignInNavigation, settleSignInNavigation, useSignInNavigation } from '@/lib/auth-navigation';
import { useAuthContext } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';

const mockRouter = { replace: jest.fn() };
let mockFocused = true;
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const { useEffect } = require('react');
    useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]);
  },
}));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
const signedOut = { loading: false, claimsLoading: false, user: null };
const base = { loading: false, claimsLoading: false, claims: null, segments: ['vendor', 'dashboard'],
  wasAuthenticated: false, navigation: 'idle' as const };
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  jest.clearAllMocks();
  beginSignInNavigation()(true);
  settleSignInNavigation();
  mockFocused = true;
  Object.assign(auth, { currentUser: null });
  jest.mocked(useAuthContext).mockReturnValue(signedOut as never);
});
afterEach(async () => { await cleanup(); jest.useRealTimers(); });

it('does not send a just-signed-in vendor to splash while React auth state catches up', () => {
  expect(authRedirect({ ...base, currentUserId: 'vendor' })).toBeNull();
});
it('does not redirect using the previous account while switching sessions', () => {
  expect(authRedirect({ ...base, currentUserId: 'new', userId: 'old' })).toBeNull();
});
it.each([{ loading: true }, { claimsLoading: true }, { navigation: 'pending' as const }])('waits during auth resolution: %j', (waiting) => {
  expect(authRedirect({ ...base, ...waiting })).toBeNull();
});
it('keeps the root guard out of an in-flight vendor membership and KYC check', () => {
  expect(authRedirect({ ...base, segments: ['(auth)', 'login'], userId: 'vendor', currentUserId: 'vendor', navigation: 'pending' })).toBeNull();
});
it.each(['login', 'vendor-login'])('preserves a failed %s form instead of overriding its inline error', (screen) => {
  expect(authRedirect({ ...base, segments: ['(auth)', screen], userId: 'vendor', currentUserId: 'vendor', navigation: 'failed' })).toBeNull();
  expect(authRedirect({ ...base, segments: ['(auth)', screen], navigation: 'failed' })).toBeNull();
});
it('routes expired vendor sessions to vendor login, not onboarding', () => {
  expect(authRedirect(base)).toBe('/(auth)/vendor-login');
});
it('sends a signed-out email-verification session to login for recovery', () => {
  expect(authRedirect({ ...base, segments: ['(auth)', 'email-verification'] })).toBe('/(auth)/login');
  expect(authRedirect({ ...base, segments: ['(auth)', 'email-verification'], userId: 'customer', currentUserId: 'customer' })).toBeNull();
});
it('resumes a restored vendor session at the dashboard', () => {
  expect(authRedirect({ ...base, segments: ['(auth)', 'splash'], userId: 'vendor', currentUserId: 'vendor',
    claims: { r: 'vendor_staff', b: 'business', br: ['branch'] } })).toBe('/vendor/dashboard');
});
it('does not overwrite an explicit KYC route before the login screen leaves the stack', () => {
  expect(authRedirect({ ...base, segments: ['(auth)', 'login'], userId: 'vendor', currentUserId: 'vendor', navigation: 'completed',
    claims: { r: 'business_owner', b: 'business', br: [] } })).toBeNull();
});
it('does not overwrite the email-verification route while registration finishes', () => {
  expect(authRedirect({ ...base, segments: ['(auth)', 'register'], userId: 'new-user', currentUserId: 'new-user', navigation: 'completed' })).toBeNull();
});
it('resumes automatic routing only after the explicit destination has committed', async () => {
  const { result } = await renderHook(() => useSignInNavigation());
  await act(() => beginSignInNavigation()(true));
  expect(result.current).toBe('completed');
  await act(() => settleSignInNavigation());
  expect(result.current).toBe('idle');
});
it('only permits the current sign-in attempt to release the navigation lock', async () => {
  const { result } = await renderHook(() => useSignInNavigation());
  let old!: ReturnType<typeof beginSignInNavigation>;
  let current!: ReturnType<typeof beginSignInNavigation>;
  await act(() => { old = beginSignInNavigation(); current = beginSignInNavigation(); });
  await act(() => old(true));
  expect(result.current).toBe('pending');
  await act(() => current(false));
  expect(result.current).toBe('failed');
});
it('does not start onboarding before Firebase finishes restoring the session', async () => {
  jest.mocked(useAuthContext).mockReturnValue({ ...signedOut, loading: true } as never);
  await render(<SplashScreen />);
  await act(() => jest.advanceTimersByTime(2800));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
it('cancels splash navigation when sign-in begins before the timer fires', async () => {
  await render(<SplashScreen />);
  await act(() => jest.advanceTimersByTime(2000));
  await act(() => { beginSignInNavigation(); });
  await act(() => jest.advanceTimersByTime(5000));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
it('checks Firebase again before a stale splash timer can navigate', async () => {
  await render(<SplashScreen />);
  Object.assign(auth, { currentUser: { uid: 'vendor' } });
  await act(() => jest.advanceTimersByTime(3000));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
it('cancels the timer when the splash is retained but no longer focused', async () => {
  const { rerender } = await render(<SplashScreen />);
  mockFocused = false;
  await rerender(<SplashScreen />);
  await act(() => jest.advanceTimersByTime(5000));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
it('preserves first-launch onboarding for a focused, resolved signed-out splash', async () => {
  await render(<SplashScreen />);
  await act(() => jest.advanceTimersByTime(2800));
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/language');
});
