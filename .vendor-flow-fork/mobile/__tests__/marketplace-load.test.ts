import { getDocs, onSnapshot, where } from 'firebase/firestore';
import { fetchMarketplaceServices, marketplaceSource, SERVICE_QUERY_CONCURRENCY } from '@/lib/marketplace-source';

const stops: (() => void)[] = [];
let snapshots: ((value: unknown) => void)[];
let failures: (() => void)[];
const unsubscribe = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  snapshots = []; failures = [];
  (onSnapshot as jest.Mock).mockImplementation((_query, success, failure) => {
    snapshots.push(success); failures.push(failure); return unsubscribe;
  });
});
afterEach(() => { stops.splice(0).forEach((stop) => stop()); jest.useRealTimers(); });
const subscribe = () => { const stop = marketplaceSource.subscribe(jest.fn()); stops.push(stop); return stop; };

it('shares one listener across 20 mounted consumers and releases it after the last', () => {
  for (let i = 0; i < 20; i++) subscribe();
  expect(onSnapshot).toHaveBeenCalledTimes(1);
  stops.splice(0, 19).forEach((stop) => stop());
  expect(unsubscribe).not.toHaveBeenCalled();
  stops.pop()!();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

it('keeps cached listings on failure and ignores old callbacks after retry', async () => {
  subscribe();
  const docs = [{ id: 'garage-a', data: () => ({ isListed: true, status: 'Approved' }) }];
  snapshots[0]({ docs });
  failures[0]();
  expect(marketplaceSource.getSnapshot()).toMatchObject({ docs, error: true, loading: false });
  const refresh = marketplaceSource.retry();
  snapshots[0]({ docs: [] });
  expect(marketplaceSource.getSnapshot().docs).toEqual(docs);
  snapshots[1]({ docs });
  await refresh;
  expect(marketplaceSource.getSnapshot().error).toBe(false);
});

it('turns a stalled initial read into a retryable state after 15 seconds', () => {
  subscribe();
  jest.advanceTimersByTime(15_000);
  expect(marketplaceSource.getSnapshot()).toMatchObject({ loading: false, error: true });
});

it('coalesces refresh taps while the listener is already loading', async () => {
  subscribe();
  const first = marketplaceSource.retry();
  const second = marketplaceSource.retry();
  expect(onSnapshot).toHaveBeenCalledTimes(1);
  snapshots[0]({ docs: [] });
  await Promise.all([first, second]);
});

it('loads services for 3,001 branches in rules-safe batches of 10 with only three concurrent reads', async () => {
  let active = 0; let peak = 0;
  (getDocs as jest.Mock).mockImplementation(async () => {
    active++; peak = Math.max(peak, active);
    await Promise.resolve();
    active--;
    return { docs: [{ id: 'service' }] };
  });
  const ids = Array.from({ length: 3001 }, (_, index) => `branch-${index}`);
  const result = await fetchMarketplaceServices(ids);
  expect(getDocs).toHaveBeenCalledTimes(301);
  expect(peak).toBe(SERVICE_QUERY_CONCURRENCY);
  expect(result).toHaveLength(301);
  const batches = (where as jest.Mock).mock.calls.filter(([field]) => field === 'branchId').map(([, , values]) => values);
  expect(batches.every((batch: string[]) => batch.length <= 10)).toBe(true);
  expect(batches.flat()).toEqual(ids);
});

it('stops scheduling remaining requests after a backend failure', async () => {
  (getDocs as jest.Mock).mockRejectedValue(new Error('permission denied'));
  await expect(fetchMarketplaceServices(Array.from({ length: 1000 }, (_, i) => `b${i}`))).rejects.toThrow('permission denied');
  expect(getDocs).toHaveBeenCalledTimes(SERVICE_QUERY_CONCURRENCY);
});

it('does not launch any requests for an aborted screen', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(fetchMarketplaceServices(['branch-a'], controller.signal)).rejects.toThrow('cancelled');
  expect(getDocs).not.toHaveBeenCalled();
});
