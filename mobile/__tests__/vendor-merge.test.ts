import { act, cleanup, renderHook } from '@testing-library/react-native';
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

it('queries the business, not the user ID, and applies the active branch', async () => {
  useQarWheelStore.setState({ activeBranchId: 'branch-a' });
  await renderHook(() => useVendorFirestoreBookings());
  expect(where).toHaveBeenCalledWith('businessId', '==', 'business-a');
  expect(where).toHaveBeenCalledWith('branchId', '==', 'branch-a');
  expect(where).not.toHaveBeenCalledWith('vendorId', expect.anything(), expect.anything());
});

it('does not issue a business-wide query for branch-scoped staff', async () => {
  jest.mocked(useAuthContext).mockReturnValue({ ...context, role: 'vendor_staff' } as never);
  await renderHook(() => useVendorFirestoreBookings());
  expect(onSnapshot).not.toHaveBeenCalled();
});

it('rejects an unassigned staff branch', async () => {
  useQarWheelStore.setState({ activeBranchId: 'another-branch' });
  jest.mocked(useAuthContext).mockReturnValue({ ...context, role: 'vendor_staff' } as never);
  await renderHook(() => useVendorFirestoreBookings());
  expect(onSnapshot).not.toHaveBeenCalled();
});

it('ignores late snapshots after changing businesses', async () => {
  const { rerender } = await renderHook(() => useVendorFirestoreBookings());
  const stale = snapshots[0];
  jest.mocked(useAuthContext).mockReturnValue({ ...context, businessId: 'business-b' } as never);
  await rerender({});
  await act(() => stale({ docs: [{ id: 'old-booking', data: () => ({}) }] }));
  expect(unsubscribe).toHaveBeenCalled();
  expect(useQarWheelStore.getState().vendorBookings).toEqual([]);
});

it('clears stale bookings on query failure and allows retry', async () => {
  const { result } = await renderHook(() => useVendorFirestoreBookings());
  await act(() => snapshots[0]({ docs: [{ id: 'real-booking', data: () => ({ createdAt: '2026-10-31' }) }] }));
  expect(useQarWheelStore.getState().vendorBookings[0].id).toBe('real-booking');
  await act(() => errors[0]());
  expect(result.current.error).toBe(true);
  expect(useQarWheelStore.getState().vendorBookings).toEqual([]);
  await act(() => result.current.retry());
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

it('does not persist or restore the server-owned vendor booking feed', () => {
  const options = useQarWheelStore.persist.getOptions();
  useQarWheelStore.setState({ vendorBookings: [{ id: 'private-booking' } as never] });
  const persisted = options.partialize!(useQarWheelStore.getState());
  expect(persisted).not.toHaveProperty('vendorBookings');
  const restored = options.merge!({ vendorBookings: [{ id: 'stale-booking' }] }, useQarWheelStore.getState());
  expect(restored.vendorBookings).toEqual([]);
});

it('recovers from a stalled initial read and cleans up timeout and listener', async () => {
  jest.useFakeTimers();
  try {
    const { result, unmount } = await renderHook(() => useVendorFirestoreBookings());
    expect(result.current.loading).toBe(true);
    await act(() => jest.advanceTimersByTime(15_000));
    expect(result.current).toMatchObject({ loading: false, error: true });
    await act(() => result.current.retry());
    expect(result.current).toMatchObject({ loading: true, error: false });
    expect(onSnapshot).toHaveBeenCalledTimes(2);
    await act(() => snapshots[1]({ docs: [] }));
    expect(result.current).toMatchObject({ loading: false, error: false });
    await act(() => jest.advanceTimersByTime(15_000));
    expect(result.current.error).toBe(false);
    await unmount();
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

describe('vendor booking timeout lifecycle', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it('times out at 15 seconds and recovers when the current listener responds', async () => {
    const { result } = await renderHook(() => useVendorFirestoreBookings());
    await act(() => jest.advanceTimersByTime(14_999));
    expect(result.current).toMatchObject({ loading: true, error: false });
    await act(() => jest.advanceTimersByTime(1));
    expect(result.current).toMatchObject({ loading: false, error: true });
    expect(unsubscribe).not.toHaveBeenCalled();

    await act(() => snapshots[0]({ docs: [{ id: 'recovered', data: () => ({}) }] }));
    expect(result.current).toMatchObject({ loading: false, error: false });
    expect(useQarWheelStore.getState().vendorBookings[0].id).toBe('recovered');
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });

  it('retries with one replacement listener and rejects stale success and error callbacks', async () => {
    const { result } = await renderHook(() => useVendorFirestoreBookings());
    await act(() => jest.advanceTimersByTime(15_000));
    await act(() => result.current.retry());
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(onSnapshot).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ loading: true, error: false });

    await act(() => snapshots[1]({ docs: [{ id: 'current', data: () => ({}) }] }));
    await act(() => {
      snapshots[0]({ docs: [{ id: 'stale', data: () => ({}) }] });
      errors[0]();
    });
    expect(result.current).toMatchObject({ loading: false, error: false });
    expect(useQarWheelStore.getState().vendorBookings.map((entry) => entry.id)).toEqual(['current']);
    await act(() => jest.advanceTimersByTime(15_000));
    expect(result.current.error).toBe(false);
  });

  it('cancels the pending deadline and ignores callbacks after unmount', async () => {
    const { unmount } = await renderHook(() => useVendorFirestoreBookings());
    await unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    await act(() => {
      snapshots[0]({ docs: [{ id: 'unmounted', data: () => ({}) }] });
      errors[0]();
      jest.advanceTimersByTime(15_000);
    });
    expect(useQarWheelStore.getState().vendorBookings).toEqual([]);
  });

  it('gives a changed vendor scope its own deadline and cancels the previous one', async () => {
    const { result, rerender } = await renderHook(() => useVendorFirestoreBookings());
    await act(() => jest.advanceTimersByTime(10_000));
    jest.mocked(useAuthContext).mockReturnValue({ ...context, businessId: 'business-b' } as never);
    await rerender({});
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    await act(() => jest.advanceTimersByTime(5_000));
    expect(result.current).toMatchObject({ loading: true, error: false });
    await act(() => jest.advanceTimersByTime(10_000));
    expect(result.current).toMatchObject({ loading: false, error: true });
  });

  it('clears the pending deadline immediately on a listener error', async () => {
    const { result } = await renderHook(() => useVendorFirestoreBookings());
    await act(() => errors[0]());
    expect(result.current).toMatchObject({ loading: false, error: true });
    await act(() => jest.advanceTimersByTime(15_000));
    expect(result.current).toMatchObject({ loading: false, error: true });
  });
});
