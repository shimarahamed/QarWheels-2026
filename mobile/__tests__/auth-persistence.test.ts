import { getAuth, initializeAuth } from 'firebase/auth';
import { createPersistentAuth } from '@/lib/auth-persistence.native';

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => 'existing-auth'), initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(() => 'native-persistence'),
}));
beforeEach(() => jest.clearAllMocks());

it('initializes native auth with persistent storage', () => {
  createPersistentAuth({} as never);
  expect(initializeAuth).toHaveBeenCalledWith({}, { persistence: 'native-persistence' });
});

it('reuses an existing instance on hot reload only', () => {
  jest.mocked(initializeAuth).mockImplementation(() => { throw { code: 'auth/already-initialized' }; });
  expect(createPersistentAuth({} as never)).toBe('existing-auth');
  expect(getAuth).toHaveBeenCalledTimes(1);
});

it('does not hide unexpected persistence failures', () => {
  jest.mocked(initializeAuth).mockImplementation(() => { throw new Error('storage failed'); });
  expect(() => createPersistentAuth({} as never)).toThrow('storage failed');
  expect(getAuth).not.toHaveBeenCalled();
});
