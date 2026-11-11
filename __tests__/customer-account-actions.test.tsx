import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import AccountServices, { AccountSettingsRoute } from '@/components/AccountServices';
import ProfileOverview from '@/app/profile-overview';
import { useAuthContext } from '@/lib/AuthContext';
import { saveNotificationPreferences, setDefaultCar, useBranches, useCars } from '@/lib/firestoreOps';
import { useQarWheelStore } from '@/lib/store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) };
const mockParams: { section?: string } = {};
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  arrayUnion: jest.fn(), arrayRemove: jest.fn(), addDoc: jest.fn(), collection: jest.fn(),
  getDocs: jest.fn(), limit: jest.fn(), onSnapshot: jest.fn(() => jest.fn()),
  query: jest.fn(), orderBy: jest.fn(), documentId: jest.fn(), where: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(), setDoc: jest.fn(), doc: jest.fn(() => ({})), serverTimestamp: jest.fn(() => 'server-time'),
}));
jest.mock('@/lib/firestoreOps', () => ({ useBranches: jest.fn(), useCars: jest.fn(), saveNotificationPreferences: jest.fn(), setDefaultCar: jest.fn() }));
jest.mock('@/lib/motion', () => ({ MotionScreen: ({ children }: any) => children, MotionSurface: ({ children }: any) => children }));
jest.mock('@/components/AnimatedPressable', () => ({
  __esModule: true,
  default: (props: any) => {
    const { Pressable } = require('react-native');
    return <Pressable accessibilityRole="button" {...props} accessibilityState={{ disabled: !!props.disabled, ...props.accessibilityState }} />;
  },
}));
jest.mock('@/lib/i18n', () => ({ useTranslation: () => ({ language: 'en', changeLanguage: jest.fn(), t: (key: string) => key }) }));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'vault-id' }));
jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///documents/' } },
  File: jest.fn().mockImplementation(function (base: { uri: string } | string, name?: string) {
    return { uri: name ? `${typeof base === 'string' ? base : base.uri}${name}` : base, size: 1024, copy: jest.fn().mockResolvedValue(undefined), exists: true, delete: jest.fn() };
  }),
}));

const user = { uid: 'user-1', displayName: 'Auth Name', email: 'real@example.com', phoneNumber: null };
const saved = { displayName: 'Saved Name', phone: '+97455555555', country: 'Qatar', area: 'Al Sadd', defaultCarId: 'car-1', notificationPreferences: { bookingConfirmations: false, serviceReminders: true, promotionalOffers: false } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.section = undefined;
  useQarWheelStore.getState().clearPersonalData();
  jest.mocked(useAuthContext).mockReturnValue({ user } as never);
  jest.mocked(getDoc).mockResolvedValue({ data: () => saved } as never);
  jest.mocked(setDoc).mockResolvedValue(undefined);
  jest.mocked(useBranches).mockReturnValue({ vendors: [], loading: false, error: false, refresh: jest.fn() } as never);
  jest.mocked(useCars).mockReturnValue({ cars: [
    { id: 'car-1', make: 'Toyota', model: 'Camry', year: 2020, currentMileage: 1000 },
    { id: 'car-2', make: 'Honda', model: 'Civic', year: 2021, currentMileage: 2000 },
  ], isLoading: false, error: false, refresh: jest.fn() } as never);
  jest.mocked(saveNotificationPreferences).mockResolvedValue(undefined);
  jest.mocked(setDefaultCar).mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
});
afterEach(cleanup);

it('loads stored profile fields through the profile-overview route and returns from edit', async () => {
  await render(<ProfileOverview />);
  expect(screen.getByLabelText('Phone').props.value).toBe(saved.phone);
  expect(screen.getByLabelText('Location').props.value).toBe('Al Sadd, Qatar');
  await fireEvent.press(screen.getAllByRole('button', { name: 'Edit profile' })[0]);
  expect(screen.getByRole('button', { name: 'Save profile' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
  expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
  expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/account');
});

it('keeps drafts on failed saves, disables pending controls, and retries without writing email', async () => {
  const pending = deferred<void>();
  jest.mocked(setDoc).mockReturnValueOnce(pending.promise);
  await render(<AccountServices initialSection="editProfile" />);
  await fireEvent.changeText(screen.getByLabelText('Full name'), 'New Name');
  await fireEvent.changeText(screen.getByLabelText('Preferred area'), 'Lusail');
  await act(async () => { void fireEvent.press(screen.getByRole('button', { name: 'Save profile' })); });
  expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  expect(screen.getByLabelText('Full name').props.editable).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Saving...' }));
  expect(setDoc).toHaveBeenCalledTimes(1);
  await act(async () => pending.reject(new Error('offline')));
  expect(Alert.alert).toHaveBeenCalledWith('Could not save', expect.any(String));
  expect(screen.getByLabelText('Preferred area').props.value).toBe('Lusail');
  await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));
  expect(setDoc).toHaveBeenLastCalledWith(expect.anything(), { displayName: 'New Name', phone: saved.phone, country: 'Qatar', area: 'Lusail', updatedAt: 'server-time' }, { merge: true });
  expect(Alert.alert).toHaveBeenCalledWith('Profile saved', expect.any(String));
});

it('does not overwrite an unread profile and supports load retry', async () => {
  jest.mocked(getDoc).mockRejectedValueOnce(new Error('offline'));
  await render(<AccountServices initialSection="editProfile" />);
  expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));
  expect(setDoc).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry account' }));
  expect(screen.getByLabelText('Preferred area').props.value).toBe('Al Sadd');
  expect(screen.getByRole('button', { name: 'Save profile' })).not.toBeDisabled();
});

it('rejects a blank name without issuing a write', async () => {
  await render(<AccountServices initialSection="editProfile" />);
  await fireEvent.changeText(screen.getByLabelText('Full name'), '   ');
  await fireEvent.press(screen.getByRole('button', { name: 'Save profile' }));
  expect(updateProfile).not.toHaveBeenCalled();
  expect(setDoc).not.toHaveBeenCalled();
});

it('rolls back a failed notification toggle, blocks concurrent changes, and retries', async () => {
  const pending = deferred<void>();
  jest.mocked(saveNotificationPreferences).mockReturnValueOnce(pending.promise);
  await render(<AccountServices initialSection="notifications" />);
  await act(async () => { void fireEvent(screen.getByLabelText('Booking confirmations'), 'valueChange', true); });
  expect(screen.getByLabelText('Service reminders')).toBeDisabled();
  await fireEvent(screen.getByLabelText('Service reminders'), 'valueChange', false);
  expect(saveNotificationPreferences).toHaveBeenCalledTimes(1);
  await act(async () => pending.reject(new Error('offline')));
  expect(screen.getByLabelText('Booking confirmations').props.value).toBe(false);
  await fireEvent(screen.getByLabelText('Booking confirmations'), 'valueChange', true);
  expect(saveNotificationPreferences).toHaveBeenLastCalledWith(user.uid, { ...saved.notificationPreferences, bookingConfirmations: true });
});

it('does not claim a new default vehicle until saved and permits retry after failure', async () => {
  const pending = deferred<void>();
  jest.mocked(setDefaultCar).mockReturnValueOnce(pending.promise);
  await render(<AccountServices initialSection="vehiclePreferences" />);
  const label = 'Make Honda Civic the default vehicle';
  await act(async () => { void fireEvent.press(screen.getByRole('button', { name: label })); });
  expect(screen.getByRole('button', { name: label })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Make Toyota Camry the default vehicle' })).toBeNull();
  await act(async () => pending.reject(new Error('offline')));
  expect(screen.getByRole('button', { name: label })).not.toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: label }));
  expect(screen.queryByRole('button', { name: label })).toBeNull();
  expect(setDefaultCar).toHaveBeenLastCalledWith(user.uid, 'car-2');
});

it('disables remote preferences for signed-out users and offers sign in', async () => {
  jest.mocked(useAuthContext).mockReturnValue({ user: null } as never);
  await render(<AccountServices initialSection="notifications" />);
  expect(screen.getByLabelText('Booking confirmations')).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/login');
  expect(saveNotificationPreferences).not.toHaveBeenCalled();
});

it('routes support without dialing placeholder numbers and handles malformed section input', async () => {
  mockParams.section = '%';
  const view = await render(<AccountSettingsRoute />);
  expect(screen.getByText('Your account')).toBeTruthy();
  await view.rerender(<AccountServices initialSection="systemSettings" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Contact support' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/contact-us');
  expect(screen.queryByText(/4000 1234/)).toBeNull();
});

it('previews documents locally instead of opening the quote modal, and shares the file', async () => {
  useQarWheelStore.getState().addDocument({ title: 'Insurance', kind: 'insurance', uri: 'file:///insurance.jpg', mimeType: 'image/jpeg' });
  await render(<AccountServices initialSection="documents" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Open Insurance' }));
  expect(screen.getByLabelText('Insurance').props.source.uri).toBe('file:///insurance.jpg');
  expect(mockRouter.push).not.toHaveBeenCalled();
  await fireEvent(screen.getByLabelText('Insurance'), 'error');
  expect(screen.getByText(/This image is no longer available/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Close document' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Share Insurance' }));
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///insurance.jpg', { dialogTitle: 'Insurance', mimeType: 'image/jpeg' });
  expect(Share.share).not.toHaveBeenCalled();
});

it('keeps all document categories reachable and handles picker denial and failure', async () => {
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
  await render(<AccountServices initialSection="documents" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add document' }));
  for (const label of ['Driving licence', 'QID / national ID', 'Insurance certificate', 'Vehicle registration', 'Other document']) expect(screen.getByRole('button', { name: label })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Other document' }));
  expect(Alert.alert).toHaveBeenCalledWith('Permission needed', expect.any(String));
  expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockRejectedValueOnce(new Error('unavailable'));
  await fireEvent.press(screen.getByRole('button', { name: 'Add document' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Driving licence' }));
  expect(Alert.alert).toHaveBeenCalledWith('Could not add document', expect.any(String));
  expect(screen.getByRole('button', { name: 'Add document' })).not.toBeDisabled();
});

it('copies picked images into the device vault and deletes owned copies', async () => {
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///cache/id.jpg', mimeType: 'image/jpeg' }] } as never);
  await render(<AccountServices initialSection="documents" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add document' }));
  await fireEvent.press(screen.getByRole('button', { name: 'QID / national ID' }));
  expect(useQarWheelStore.getState().documents[0].uri).toBe('file:///documents/qarwheel-vault-vault-id.jpeg');
  const source = jest.mocked(File).mock.results.find((result) => result.value.uri === 'file:///cache/id.jpg');
  expect(source?.value.copy).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Delete QID / national ID' }));
  const actions = jest.mocked(Alert.alert).mock.lastCall?.[2];
  await act(async () => { actions?.find((action) => action.text === 'Delete')?.onPress?.(); });
  expect(useQarWheelStore.getState().documents).toHaveLength(0);
  expect(jest.mocked(File).mock.results.at(-1)?.value.delete).toHaveBeenCalled();
});

it('rejects an oversized document without copying it or claiming it was saved', async () => {
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///cache/large.jpg', mimeType: 'image/jpeg', fileSize: 11 * 1024 * 1024 }],
  } as never);
  await render(<AccountServices initialSection="documents" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add document' }));
  await fireEvent.press(screen.getByRole('button', { name: 'QID / national ID' }));
  expect(Alert.alert).toHaveBeenCalledWith('Could not add document', 'Choose an image smaller than 10 MB.');
  expect(useQarWheelStore.getState().documents).toHaveLength(0);
  expect(jest.mocked(File).mock.results.at(-1)?.value.copy).not.toHaveBeenCalled();
});

it('exports the advertised data and reports a share failure', async () => {
  await render(<AccountServices initialSection="privacy" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));
  const data = JSON.parse(jest.mocked(Share.share).mock.calls[0][0].message!);
  expect(data).toEqual(expect.objectContaining({ vehicles: expect.any(Array), invoices: [], bookings: [], savedGarages: [] }));
  jest.mocked(Share.share).mockRejectedValueOnce(new Error('unavailable'));
  await fireEvent.press(screen.getByRole('button', { name: 'Export my data' }));
  expect(Alert.alert).toHaveBeenCalledWith('Export failed', expect.any(String));
});
