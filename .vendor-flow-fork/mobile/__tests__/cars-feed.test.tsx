import { act, cleanup, renderHook } from '@testing-library/react-native';
import { onSnapshot } from 'firebase/firestore';
import { useCars } from '@/lib/firestoreOps';

jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/geo', () => ({ haversineKm: jest.fn(), useDeviceLocation: () => ({ location: null }) }));

type Snapshot = { docs: { id: string; data: () => Record<string, unknown> }[] };
type Listener = { next: (snapshot: Snapshot) => void; error: (error: Error) => void; unsubscribe: jest.Mock };
let listeners: Listener[];

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  jest.clearAllMocks();
  listeners = [];
  (onSnapshot as jest.Mock).mockImplementation((_query, next, error) => {
    const unsubscribe = jest.fn();
    listeners.push({ next, error, unsubscribe });
    return unsubscribe;
  });
});

afterEach(async () => {
  await cleanup();
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

const car = (id: string) => ({ id, data: () => ({ make: 'Nissan', model: 'Patrol', year: 2023 }) });

it('does not subscribe when signed out', async () => {
  const { result } = await renderHook(() => useCars(null));
  expect(result.current).toMatchObject({ cars: [], isLoading: false, error: false });
  expect(onSnapshot).not.toHaveBeenCalled();
});

it('keeps last-known vehicles on a read error and recovers on retry', async () => {
  const { result } = await renderHook(() => useCars('customer-a'));
  await act(() => listeners[0].next({ docs: [car('car-a')] }));
  expect(result.current.cars).toEqual([expect.objectContaining({ id: 'car-a', model: 'Patrol' })]);
  await act(() => listeners[0].error(new Error('offline')));
  expect(result.current).toMatchObject({ isLoading: false, error: true });
  expect(result.current.cars).toHaveLength(1);

  await act(() => result.current.refresh());
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  expect(result.current).toMatchObject({ isLoading: true, error: false });
  await act(() => listeners[1].next({ docs: [car('car-a'), car('car-b')] }));
  expect(result.current).toMatchObject({ isLoading: false, error: false });
  expect(result.current.cars).toHaveLength(2);
});

it('never shows the previous account vehicles during a session switch', async () => {
  const { result, rerender } = await renderHook(({ userId }: { userId: string | null }) => useCars(userId), {
    initialProps: { userId: 'customer-a' as string | null },
  });
  await act(() => listeners[0].next({ docs: [car('private-a')] }));
  await rerender({ userId: 'customer-b' });
  expect(result.current).toMatchObject({ cars: [], isLoading: true, error: false });
  expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  await act(() => listeners[0].next({ docs: [car('late-a')] }));
  expect(result.current.cars).toEqual([]);
  await act(() => listeners[1].next({ docs: [car('private-b')] }));
  expect(result.current.cars.map(({ id }) => id)).toEqual(['private-b']);
});

it('times out a stalled read and accepts a later successful snapshot', async () => {
  const { result } = await renderHook(() => useCars('customer-a'));
  await act(() => jest.advanceTimersByTime(15_000));
  expect(result.current).toMatchObject({ cars: [], isLoading: false, error: true });
  await act(() => listeners[0].next({ docs: [car('recovered')] }));
  expect(result.current).toMatchObject({ isLoading: false, error: false });
  expect(result.current.cars.map(({ id }) => id)).toEqual(['recovered']);
});
