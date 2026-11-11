import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getDocs, onSnapshot } from 'firebase/firestore';
import { useAuthContext } from '@/lib/AuthContext';
import { VendorBranchesProvider, useVendorBranches } from '@/lib/vendorQueries';
import { useQarWheelStore } from '@/lib/store';

jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
const owner = { user: { uid: 'vendor-a' }, businessId: 'business-a', role: 'business_owner', branchIds: [], claimsLoading: false };
beforeEach(() => {
  jest.clearAllMocks();
  useQarWheelStore.getState().clearPersonalData();
  jest.mocked(useAuthContext).mockReturnValue(owner as never);
  (onSnapshot as jest.Mock).mockImplementation(() => jest.fn());
});

it('shares one branch subscription between layout and switcher consumers', async () => {
  await renderHook(() => [useVendorBranches(), useVendorBranches()], { wrapper: VendorBranchesProvider });
  expect(onSnapshot).toHaveBeenCalledTimes(1);
});

it('fetches every assigned branch without silently truncating after thirty', async () => {
  const ids = Array.from({ length: 65 }, (_, i) => `branch-${i}`);
  jest.mocked(useAuthContext).mockReturnValue({ ...owner, role: 'vendor_staff', branchIds: ids } as never);
  let offset = 0;
  (getDocs as jest.Mock).mockImplementation(async () => {
    const page = ids.slice(offset, offset + 30); offset += 30;
    return { docs: page.map((id) => ({ id, data: () => ({ businessId: 'business-a', name: id }) })) };
  });
  const { result } = await renderHook(() => useVendorBranches(), { wrapper: VendorBranchesProvider });
  await waitFor(() => expect(result.current.branches).toHaveLength(65));
  expect(getDocs).toHaveBeenCalledTimes(3);
  expect(result.current.activeBranch?.id).toBe('branch-0');
});

it('rejects late metadata from the previous business and unassigned selections', async () => {
  const callbacks: ((value: unknown) => void)[] = [];
  (onSnapshot as jest.Mock).mockImplementation((_q, next) => { callbacks.push(next); return jest.fn(); });
  const { result, rerender } = await renderHook(() => useVendorBranches(), { wrapper: VendorBranchesProvider });
  jest.mocked(useAuthContext).mockReturnValue({ ...owner, businessId: 'business-b' } as never);
  await rerender({});
  await act(() => callbacks[0]({ docs: [{ id: 'old', data: () => ({ businessId: 'business-a' }) }] }));
  expect(result.current.branches).toEqual([]);
  await act(() => callbacks[1]({ docs: [{ id: 'new', data: () => ({ businessId: 'business-b' }) }] }));
  await act(() => result.current.setActiveBranch('unassigned'));
  expect(useQarWheelStore.getState().activeBranchId).toBe('new');
});
