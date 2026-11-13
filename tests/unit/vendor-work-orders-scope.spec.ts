import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase';
import { useVendor } from '@/components/vendor/vendor-provider';
import { useBranchWorkOrders } from '@/hooks/use-branch-work-orders';
import type { Booking, WithId } from '@/lib/types';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_database, path) => path),
  where: vi.fn((field, operator, value) => ({ field, operator, value })),
  query: vi.fn((...constraints) => constraints),
}));
vi.mock('@/firebase', () => ({
  useFirebase: () => ({ firestore: {} }),
  useMemoFirebase: (factory: () => unknown) => factory(),
  useCollection: vi.fn(() => ({ data: [], isLoading: false, error: null })),
}));
vi.mock('@/components/vendor/vendor-provider', () => ({ useVendor: vi.fn() }));

function vendorState(canRead = true, hasBranch = true) {
  vi.mocked(useVendor).mockReturnValue({
    business: { id: 'business-a' },
    activeBranch: hasBranch ? { id: 'branch-a', name: 'Main workshop' } : null,
    canAccess: () => canRead,
  } as unknown as ReturnType<typeof useVendor>);
}

describe('vendor work order read scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCollection).mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it('reads only the selected business and branch', () => {
    vendorState();
    useBranchWorkOrders();
    expect(where).toHaveBeenCalledWith('businessId', '==', 'business-a');
    expect(where).toHaveBeenCalledWith('branchId', '==', 'branch-a');
    expect(query).toHaveBeenCalledOnce();
  });

  it.each([[false, true], [true, false]])('does not query with permission=%s, branch=%s', (canRead, hasBranch) => {
    vendorState(canRead, hasBranch);
    useBranchWorkOrders();
    expect(query).not.toHaveBeenCalled();
    expect(useCollection).toHaveBeenCalledWith(null);
  });

  it.each([['business-a', 'previous-branch'], ['previous-business', 'branch-a']])('hides stale data from %s / %s while the subscription changes', (businessId, branchId) => {
    vendorState();
    vi.mocked(useCollection).mockReturnValue({ data: [{ id: 'old-job', businessId, branchId } as WithId<Booking>], isLoading: false, error: null });
    const result = useBranchWorkOrders();
    expect(result.data).toBeNull();
    expect(result.isLoading).toBe(true);
  });

  it('returns the current branch snapshot after it arrives', () => {
    vendorState();
    const bookings = [{ id: 'job-a', businessId: 'business-a', branchId: 'branch-a' } as WithId<Booking>];
    vi.mocked(useCollection).mockReturnValue({ data: bookings, isLoading: false, error: null });
    expect(useBranchWorkOrders()).toMatchObject({ data: bookings, isLoading: false });
  });
});
