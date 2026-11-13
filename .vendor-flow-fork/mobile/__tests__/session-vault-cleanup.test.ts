import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signOutCompletely } from '@/lib/session';
import { useQarWheelStore } from '@/lib/store';

const mockDelete = jest.fn();
jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///app/documents/' } },
  File: class {
    uri: string;
    constructor(base: { uri: string } | string, name = '') { this.uri = `${typeof base === 'string' ? base : base.uri}${name}`; }
    get exists() { return true; }
    delete() { mockDelete(this.uri); }
  },
}));
jest.mock('@/lib/notifications', () => ({ clearPushTokenFromProfile: jest.fn(async () => {}) }));
jest.mock('@/lib/observability', () => ({ identifyUser: jest.fn(), track: jest.fn() }));
jest.mock('@/lib/biometrics', () => ({ disableBiometricUnlock: jest.fn(async () => {}) }));

beforeEach(() => {
  mockDelete.mockClear();
  jest.mocked(signOut).mockResolvedValue(undefined);
  Object.assign(auth, { currentUser: { uid: 'customer-1' } });
  useQarWheelStore.getState().clearPersonalData();
});

it('deletes only app-owned vault copies when signing out', async () => {
  const store = useQarWheelStore.getState();
  store.addDocument({ kind: 'id', title: 'QID', uri: 'file:///app/documents/qarwheel-vault-123e4567-e89b-12d3-a456-426614174000.jpg' });
  store.addDocument({ kind: 'license', title: 'Original', uri: 'file:///pictures/original.jpg' });
  store.addDocument({ kind: 'license', title: 'Bad path', uri: 'file:///app/documents/qarwheel-vault-../../other.jpg' });
  await signOutCompletely();
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockDelete).toHaveBeenCalledWith('file:///app/documents/qarwheel-vault-123e4567-e89b-12d3-a456-426614174000.jpg');
  expect(useQarWheelStore.getState().documents).toEqual([]);
});

it('clears the index and owned files even if Firebase sign-out rejects', async () => {
  useQarWheelStore.getState().addDocument({ kind: 'id', title: 'QID', uri: 'file:///app/documents/qarwheel-vault-123e4567-e89b-12d3-a456-426614174000.png' });
  jest.mocked(signOut).mockRejectedValueOnce(new Error('offline'));
  await expect(signOutCompletely()).rejects.toThrow('offline');
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(useQarWheelStore.getState().documents).toEqual([]);
});
