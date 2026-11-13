import { act, cleanup, renderHook } from '@testing-library/react-native';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { useFirestoreBookings } from '@/lib/firestoreOps';
import { useQarWheelStore } from '@/lib/store';

jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/geo', () => ({ haversineKm: jest.fn(), useDeviceLocation: () => ({ location: null }) }));

function bookingDoc(id: string, data: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      userId: 'customer-a', branchId: 'branch-a', branchName: 'Garage A',
      carId: 'car-a', carDescription: '2023 Nissan Patrol', serviceName: 'Oil change',
      bookingDate: '2026-11-02T08:00:00.000Z', status: 'Pending', cost: 240,
      ...data,
    }),
  };
}

type Snapshot = { docs: ReturnType<typeof bookingDoc>[] };
type Listener = { next: (snapshot: Snapshot) => void; error: (error: Error) => void; unsubscribe: jest.Mock };
let listeners: Listener[];

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  jest.clearAllMocks();
  listeners = [];
  (collection as jest.Mock).mockImplementation((_db, ...segments: string[]) => ({ path: segments.join('/') }));
  (where as jest.Mock).mockImplementation((field, operator, value) => ({ field, operator, value }));
  (orderBy as jest.Mock).mockImplementation((field, direction) => ({ field, direction }));
  (limit as jest.Mock).mockImplementation((count) => ({ limit: count }));
  (query as jest.Mock).mockImplementation((source, ...constraints) => ({ source, constraints }));
  (onSnapshot as jest.Mock).mockImplementation((_query, next, error) => {
    const unsubscribe = jest.fn();
    listeners.push({ next, error, unsubscribe });
    return unsubscribe;
  });
  await act(async () => { useQarWheelStore.getState().clearPersonalData(); });
});

afterEach(async () => {
  await cleanup();
  try {
    expect(jest.getTimerCount()).toBe(0);
    await act(async () => { jest.runOnlyPendingTimers(); });
  } finally {
    jest.useRealTimers();
  }
});

it('does not subscribe or expose cached bookings when signed out', async () => {
  useQarWheelStore.setState({ bookings: [{ id: 'booking_local', service: 'Cached booking' }] as never });
  const { result } = await renderHook(() => useFirestoreBookings(null));
  expect(result.current).toMatchObject({ bookings: [], loading: false, error: false });
  await act(() => result.current.refresh());
  expect(onSnapshot).not.toHaveBeenCalled();
  expect(collection).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('scopes the listener to the customer and maps only its remote rows into the feed', async () => {
  useQarWheelStore.setState({ bookings: [{ id: 'booking_local', service: 'Pending local booking' }] as never });
  const { result } = await renderHook(() => useFirestoreBookings('customer-a'));
  expect(result.current).toMatchObject({ bookings: [], loading: true, error: false });
  expect(onSnapshot).toHaveBeenCalledTimes(1);
  expect(onSnapshot).toHaveBeenCalledWith({
    source: { path: 'bookings' },
    constraints: [
      { field: 'userId', operator: '==', value: 'customer-a' },
      { field: 'createdAt', direction: 'desc' },
      { limit: 51 },
    ],
  }, expect.any(Function), expect.any(Function));
  await act(() => listeners[0].next({ docs: [bookingDoc('remote-a', {
    vendorId: 'legacy-vendor', vendorName: 'Legacy garage', carName: 'Legacy car',
    bookingDate: { toDate: () => new Date('2026-11-02T08:00:00.000Z') },
    status: 'ReadyForPickup', notes: 'Call first', timeSlot: '08:00 AM', paymentMethod: 'Pay at garage',
  })] }));
  expect(result.current).toMatchObject({ loading: false, error: false });
  expect(result.current.bookings).toEqual([expect.objectContaining({
    id: 'remote-a', garage: 'Garage A', garageId: 'branch-a', service: 'Oil change',
    vehicle: '2023 Nissan Patrol', vehicleId: 'car-a', date: '2026-11-02T08:00:00.000Z',
    bookingDate: '2026-11-02T08:00:00.000Z', status: 'ReadyForPickup', totalAmount: 240,
    notes: 'Call first', timeSlot: '08:00 AM', paymentMethod: 'Pay at garage',
  })]);
  expect(useQarWheelStore.getState().bookings.map(({ id }) => id)).toEqual(['remote-a', 'booking_local']);
  await act(() => listeners[0].next({ docs: [] }));
  expect(result.current).toMatchObject({ bookings: [], loading: false, error: false });
  expect(useQarWheelStore.getState().bookings.map(({ id }) => id)).toEqual(['booking_local']);
  await act(() => jest.advanceTimersByTime(15_000));
  expect(result.current.error).toBe(false);
});

it('preserves legacy booking field fallbacks and Date values', async () => {
  const { result } = await renderHook(() => useFirestoreBookings('customer-a'));
  await act(() => listeners[0].next({ docs: [bookingDoc('legacy', {
    branchId: undefined, branchName: undefined, carDescription: undefined,
    vendorId: 'legacy-vendor', vendorName: 'Legacy garage', carName: 'Legacy car',
    bookingDate: new Date('2026-11-03T08:00:00.000Z'), status: undefined, cost: undefined,
  })] }));
  expect(result.current.bookings[0]).toMatchObject({
    garageId: 'legacy-vendor', garage: 'Legacy garage', vehicle: 'Legacy car',
    date: '2026-11-03T08:00:00.000Z', status: 'Pending', totalAmount: 0,
  });
});

it('bounds the initial listener and loads history only on request', async () => {
  const { result } = await renderHook(() => useFirestoreBookings('customer-a'));
  const firstPage = Array.from({ length: 51 }, (_, index) => bookingDoc(`booking-${index}`));
  await act(() => listeners[0].next({ docs: firstPage }));
  expect(result.current.bookings).toHaveLength(50);
  expect(result.current.hasMore).toBe(true);
  expect(onSnapshot).toHaveBeenCalledTimes(1);

  await act(() => result.current.loadMore());
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  expect(onSnapshot).toHaveBeenCalledTimes(2);
  expect(query).toHaveBeenLastCalledWith(
    { path: 'bookings' },
    { field: 'userId', operator: '==', value: 'customer-a' },
    { field: 'createdAt', direction: 'desc' },
    { limit: 101 },
  );
  expect(result.current.loadingMore).toBe(true);
  await act(() => listeners[1].next({ docs: Array.from({ length: 75 }, (_, index) => bookingDoc(`booking-${index}`)) }));
  expect(result.current.bookings).toHaveLength(75);
  expect(result.current.hasMore).toBe(false);
  expect(result.current.loadingMore).toBe(false);
});

it('clears the prior customer feed on account change and ignores that listener after cleanup', async () => {
  const { result, rerender } = await renderHook(({ userId }: { userId: string | null }) => useFirestoreBookings(userId), {
    initialProps: { userId: 'customer-a' as string | null },
  });
  await act(() => listeners[0].next({ docs: [bookingDoc('remote-a')] }));
  await rerender({ userId: 'customer-b' });
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  expect(result.current).toMatchObject({ bookings: [], loading: true, error: false });
  expect(where).toHaveBeenLastCalledWith('userId', '==', 'customer-b');
  const cachedBookings = useQarWheelStore.getState().bookings;
  await act(() => {
    listeners[0].next({ docs: [bookingDoc('late-a')] });
    listeners[0].error(new Error('permission-denied'));
  });
  expect(result.current).toMatchObject({ bookings: [], loading: true, error: false });
  expect(useQarWheelStore.getState().bookings).toBe(cachedBookings);
  await act(() => listeners[1].next({ docs: [bookingDoc('remote-b', { userId: 'customer-b' })] }));
  expect(result.current.bookings.map(({ id }) => id)).toEqual(['remote-b']);
  await rerender({ userId: null });
  expect(result.current).toMatchObject({ bookings: [], loading: false, error: false });
  expect(listeners[1].unsubscribe).toHaveBeenCalledTimes(1);
  const signedOutCache = useQarWheelStore.getState().bookings;
  await act(() => {
    listeners[1].next({ docs: [bookingDoc('late-b', { userId: 'customer-b' })] });
    listeners[1].error(new Error('permission-denied'));
  });
  expect(result.current).toMatchObject({ bookings: [], loading: false, error: false });
  expect(useQarWheelStore.getState().bookings).toBe(signedOutCache);
  expect(onSnapshot).toHaveBeenCalledTimes(2);
});

it.each([false, true])('exposes read errors and retries without losing same-customer rows (cached: %s)', async (cached) => {
  const { result } = await renderHook(() => useFirestoreBookings('customer-a'));
  if (cached) await act(() => listeners[0].next({ docs: [bookingDoc('remote-a')] }));
  await act(() => listeners[0].error(new Error('permission-denied')));
  expect(result.current).toMatchObject({ loading: false, error: true });
  expect(result.current.bookings.map(({ id }) => id)).toEqual(cached ? ['remote-a'] : []);
  expect(jest.getTimerCount()).toBe(0);
  await act(() => result.current.refresh());
  expect(result.current).toMatchObject({ loading: true, error: false });
  expect(result.current.bookings.map(({ id }) => id)).toEqual(cached ? ['remote-a'] : []);
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  expect(onSnapshot).toHaveBeenCalledTimes(2);
  await act(() => {
    listeners[0].next({ docs: [bookingDoc('obsolete')] });
    listeners[0].error(new Error('late failure'));
  });
  expect(result.current).toMatchObject({ loading: true, error: false });
  expect(result.current.bookings.map(({ id }) => id)).toEqual(cached ? ['remote-a'] : []);
  await act(() => listeners[1].next({ docs: [bookingDoc('retried')] }));
  expect(result.current).toMatchObject({ loading: false, error: false });
  expect(result.current.bookings.map(({ id }) => id)).toEqual(['retried']);
  expect(jest.getTimerCount()).toBe(0);
});

it('turns a stalled read into an error at 15 seconds and gives a retry a fresh deadline', async () => {
  const { result } = await renderHook(() => useFirestoreBookings('customer-a'));
  await act(() => jest.advanceTimersByTime(14_999));
  expect(result.current).toMatchObject({ loading: true, error: false });
  await act(() => jest.advanceTimersByTime(1));
  expect(result.current).toMatchObject({ bookings: [], loading: false, error: true });
  await act(() => result.current.refresh());
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  expect(result.current).toMatchObject({ loading: true, error: false });
  await act(() => jest.advanceTimersByTime(14_999));
  expect(result.current).toMatchObject({ loading: true, error: false });
  await act(() => listeners[1].next({ docs: [bookingDoc('recovered')] }));
  await act(() => jest.advanceTimersByTime(15_000));
  expect(result.current).toMatchObject({ loading: false, error: false });
  expect(result.current.bookings.map(({ id }) => id)).toEqual(['recovered']);
});

it('can recover from a timeout when the existing listener finally delivers a snapshot', async () => {
  const { result } = await renderHook(() => useFirestoreBookings('customer-a'));
  await act(() => jest.advanceTimersByTime(15_000));
  expect(result.current.error).toBe(true);
  await act(() => listeners[0].next({ docs: [] }));
  expect(result.current).toMatchObject({ bookings: [], loading: false, error: false });
  expect(onSnapshot).toHaveBeenCalledTimes(1);
});

it('cancels the old deadline when refreshing an in-flight read', async () => {
  const { result } = await renderHook(() => useFirestoreBookings('customer-a'));
  await act(() => jest.advanceTimersByTime(10_000));
  await act(() => result.current.refresh());
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(1);
  await act(() => jest.advanceTimersByTime(5_000));
  expect(result.current).toMatchObject({ loading: true, error: false });
  await act(() => jest.advanceTimersByTime(10_000));
  expect(result.current).toMatchObject({ loading: false, error: true });
});

it('releases its listener and timeout on unmount and ignores any queued callbacks', async () => {
  const { result, rerender, unmount } = await renderHook(() => useFirestoreBookings('customer-a'));
  await rerender({});
  expect(onSnapshot).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(1);
  const previousResult = result.current;
  await unmount();
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
  await act(() => {
    listeners[0].next({ docs: [bookingDoc('late')] });
    listeners[0].error(new Error('late failure'));
    jest.advanceTimersByTime(15_000);
  });
  expect(result.current).toBe(previousResult);
  expect(useQarWheelStore.getState().bookings).toEqual([]);
});
