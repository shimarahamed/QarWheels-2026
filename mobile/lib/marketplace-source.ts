import { collection, getDocs, onSnapshot, query, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import { firestore } from './firebase';

type CatalogState = { docs: QueryDocumentSnapshot[]; loading: boolean; error: boolean };
const initial: CatalogState = { docs: [], loading: true, error: false };
let state = initial;
const listeners = new Set<() => void>();
const refreshWaiters = new Set<() => void>();
let unsubscribe: (() => void) | undefined;
let generation = 0;
let timeout: ReturnType<typeof setTimeout> | undefined;

function publish(next: CatalogState) {
  state = next;
  listeners.forEach((listener) => listener());
  if (!next.loading) {
    refreshWaiters.forEach((resolve) => resolve());
    refreshWaiters.clear();
  }
}

function stop() {
  generation += 1;
  clearTimeout(timeout);
  unsubscribe?.();
  unsubscribe = undefined;
  refreshWaiters.forEach((resolve) => resolve());
  refreshWaiters.clear();
}

function start() {
  stop();
  const current = generation;
  publish({ ...state, loading: true, error: false });
  // Firestore can wait indefinitely while offline. Keep a recoverable state.
  timeout = setTimeout(() => {
    if (current === generation) publish({ ...state, loading: false, error: true });
  }, 15_000);
  unsubscribe = onSnapshot(query(collection(firestore, 'branches'), where('isListed', '==', true)), (snapshot) => {
    if (current !== generation) return;
    clearTimeout(timeout);
    publish({ docs: snapshot.docs.filter((entry) => !entry.data().vacationMode), loading: false, error: false });
  }, () => {
    if (current !== generation) return;
    clearTimeout(timeout);
    publish({ ...state, loading: false, error: true });
  });
}

// One public catalog listener, regardless of how many stacked screens use it.
export const marketplaceSource = {
  getSnapshot: () => state,
  getServerSnapshot: () => initial,
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) start();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        stop();
        state = initial;
      }
    };
  },
  retry(): Promise<void> {
    if (!listeners.size) return Promise.resolve();
    if (!state.loading) start();
    return state.loading ? new Promise((resolve) => refreshWaiters.add(resolve)) : Promise.resolve();
  },
};

export const SERVICE_QUERY_CONCURRENCY = 3;

export async function fetchMarketplaceServices(branchIds: string[], signal?: AbortSignal): Promise<QueryDocumentSnapshot[]> {
  const batches: string[][] = [];
  for (let i = 0; i < branchIds.length; i += 30) batches.push(branchIds.slice(i, i + 30));
  const pages: QueryDocumentSnapshot[][] = new Array(batches.length);
  let cursor = 0;
  let failed = false;
  async function worker() {
    while (!failed && cursor < batches.length) {
      if (signal?.aborted) throw new Error('Service request cancelled.');
      const index = cursor++;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      const snapshot = await Promise.race([
        getDocs(query(collection(firestore, 'branch_services'), where('branchId', 'in', batches[index]), where('active', '==', true))),
        new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(new Error('Service lookup timed out.')), 15_000); }),
      ]).catch((error) => {
          failed = true;
          throw error;
        }).finally(() => clearTimeout(deadline));
      if (signal?.aborted) throw new Error('Service request cancelled.');
      pages[index] = snapshot.docs;
    }
  }
  await Promise.all(Array.from({ length: Math.min(SERVICE_QUERY_CONCURRENCY, batches.length) }, worker));
  return pages.flat();
}
