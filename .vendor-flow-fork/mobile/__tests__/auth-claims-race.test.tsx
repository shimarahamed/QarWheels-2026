import { act, renderHook } from '@testing-library/react-native';
import { onIdTokenChanged } from 'firebase/auth';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';

jest.mock('firebase/auth', () => ({ onIdTokenChanged: jest.fn() }));

it('does not restore an old vendor scope after a newer session signs out', async () => {
  let listener!: (user: unknown) => Promise<void>;
  (onIdTokenChanged as jest.Mock).mockImplementation((_auth, next) => { listener = next; return jest.fn(); });
  const { result } = await renderHook(() => useAuthContext(), { wrapper: AuthProvider });
  let resolve!: (value: unknown) => void;
  const token = new Promise((done) => { resolve = done; });
  let oldCallback!: Promise<void>;
  await act(() => { oldCallback = listener({ uid: 'old-vendor', getIdTokenResult: () => token }); });
  expect(result.current.claimsLoading).toBe(true);
  await act(async () => { await listener(null); });
  await act(async () => {
    resolve({ claims: { qw: { r: 'business_owner', b: 'old-business', br: [] } } });
    await oldCallback;
  });
  expect(result.current.user).toBeNull();
  expect(result.current.businessId).toBeNull();
  expect(result.current.claimsLoading).toBe(false);
});
