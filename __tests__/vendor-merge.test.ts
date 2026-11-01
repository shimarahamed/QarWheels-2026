import { act, renderHook } from '@testing-library/react-native';
import { onSnapshot, where } from 'firebase/firestore';
import { useAuthContext } from '@/lib/AuthContext';
import { useVendorFirestoreBookings } from '@/lib/firestoreOps';
import { useQarWheelStore } from '@/lib/store';
import { vendorBookings, vendorProfile } from '@/lib/vendor-data';

jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/geo', () => ({ haversineKm: jest.fn(), useDeviceLocation: () => ({ location: null }) }));

const context = {
  user: { uid: 'vendor-a' }, businessId: 'business-a', role: 'business_owner',
  branchIds: ['branch-a'], claimsLoading: false,
};
let snapshots: ((snapshot: unknown) => void)[];
let errors: (() => void)[];
const unsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  snapshots = []; errors = [];
  useQarWheelStore.getState().clearPersonalData();
  jest.mocked(useAuthContext).mockReturnValue(context as never);
  (onSnapshot as jest.Mock).mockImplementation((_query, next, error) => {
    snapshots.push(next); errors.push(error); return unsubscribe;
  });
});

it('queries the business, not the user ID, and applies the active branch', () => {
  useQarWheelStore.setState({ activeBranchId: 'branch-a' });
  renderHook(() => useVendorFirestoreBookings());
  expect(where).toHaveBeenCalledWith('businessId', '==', 'business-a');
  expect(where).toHaveBeenCalledWith('branchId', '==', 'branch-a');
  expect(where).not.toHaveBeenCalledWith('vendorId', expect.anything(), expect.anything());
});

it('does not issue a business-wide query for branch-scoped staff', () => {
  jest.mocked(useAuthContext).mockReturnValue({ ...context, role: 'vendor_staff' } as never);
  renderHook(() => useVendorFirestoreBookings());
  expect(onSnapshot).not.toHaveBeenCalled();
});

it('rejects an unassigned staff branch', () => {
  useQarWheelStore.setState({ activeBranchId: 'another-branch' });
  jest.mocked(useAuthContext).mockReturnValue({ ...context, role: 'vendor_staff' } as never);
  renderHook(() => useVendorFirestoreBookings());
  expect(onSnapshot).not.toHaveBeenCalled();
});

it('ignores late snapshots after changing businesses', () => {
  const { rerender } = renderHook(() => useVendorFirestoreBookings());
  const stale = snapshots[0];
  jest.mocked(useAuthContext).mockReturnValue({ ...context, businessId: 'business-b' } as never);
  rerender({});
  act(() => stale({ docs: [{ id: 'old-booking', data: () => ({}) }] }));
  expect(unsubscribe).toHaveBeenCalled();
  expect(useQarWheelStore.getState().vendorBookings).toEqual([]);
});

it('clears stale bookings on query failure and allows retry', () => {
  const { result } = renderHook(() => useVendorFirestoreBookings());
  act(() => snapshots[0]({ docs: [{ id: 'real-booking', data: () => ({ createdAt: '2026-10-31' }) }] }));
  expect(useQarWheelStore.getState().vendorBookings[0].id).toBe('real-booking');
  act(() => errors[0]());
  expect(result.current.error).toBe(true);
  expect(useQarWheelStore.getState().vendorBookings).toEqual([]);
  act(() => result.current.retry());
  expect(onSnapshot).toHaveBeenCalledTimes(2);
});

it('migrates only known fixtures while retaining current records and preferences', async () => {
  const migrate = useQarWheelStore.persist.getOptions().migrate!;
  const currentBooking = { id: 'firestore-booking', service: 'Real service' };
  const personalFile = { uri: 'file:///document.jpg' };
  const result = await migrate({
    vendorBookings: [...vendorBookings, currentBooking], vendorProfile,
    bookings: [currentBooking], documents: [personalFile], language: 'ar',
  }, 1);
  expect(result).toMatchObject({
    vendorBookings: [currentBooking], bookings: [currentBooking], documents: [personalFile], language: 'ar',
    vendorProfile: { verified: false, kyc: { status: 'Pending', iban: '' } },
  });
});

it('recovers from a stalled initial read and cleans up timeout and listener', () => {
  jest.useFakeTimers();
  try {
    const { result, unmount } = renderHook(() => useVendorFirestoreBookings());
    expect(result.current.loading).toBe(true);
    act(() => jest.advanceTimersByTime(15_000));
    expect(result.current).toMatchObject({ loading: false, error: true });
    act(() => result.current.retry());
    expect(result.current).toMatchObject({ loading: true, error: false });
    expect(onSnapshot).toHaveBeenCalledTimes(2);
    act(() => snapshots[1]({ docs: [] }));
    expect(result.current).toMatchObject({ loading: false, error: false });
    act(() => jest.advanceTimersByTime(15_000));
    expect(result.current.error).toBe(false);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  } finally {
    jest.useRealTimers();
  }
});

it('preserves a customized vendor profile during migration', async () => {
  const custom = { ...vendorProfile, businessName: 'My updated business' };
  const result = await useQarWheelStore.persist.getOptions().migrate!({ vendorProfile: custom }, 1);
  expect(result).toMatchObject({ vendorProfile: custom });
});
