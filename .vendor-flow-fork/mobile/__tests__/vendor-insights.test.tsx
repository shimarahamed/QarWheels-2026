import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { collection, getDocsFromServer, limit, query, where } from 'firebase/firestore';
import AnalyticsScreen from '@/app/vendor/analytics';
import ReviewsScreen from '@/app/vendor/reviews';
import { useAuthContext } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';
import { saveVendorReviewReply } from '@/lib/vendor-review-reply';
import { useVendorBranches } from '@/lib/vendorQueries';
import {
  aggregateVendorBookings, aggregateVendorReviews, insightPeriodStart, INSIGHT_LIMITS,
  INSIGHT_TIMEOUT_MS, resolveInsightScope, useVendorInsights, type InsightRecord,
} from '@/lib/vendor-insights';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, path) => ({ path })),
  query: jest.fn((source, ...constraints) => ({ source, constraints })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  limit: jest.fn((count) => ({ limit: count })),
  getDocsFromServer: jest.fn(),
}));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/vendor-review-reply', () => ({ saveVendorReviewReply: jest.fn() }));
jest.mock('@/lib/vendorQueries', () => ({ useVendorBranches: jest.fn() }));
jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('@/components/VendorTabBar', () => ({ VendorTabBar: () => null, useVendorTabBottom: () => 60 }));

const now = new Date('2026-11-05T12:00:00.000Z');
const scope = { uid: 'owner-a', businessId: 'business-a', branchId: 'branch-a' };
const branch = { id: 'branch-a', businessId: 'business-a', name: 'Branch A', city: 'Doha', country: 'Qatar', status: 'Approved' };
const owner = { user: { uid: 'owner-a' }, businessId: 'business-a', role: 'business_owner', branchIds: [], loading: false, claimsLoading: false };
const branchState = { branches: [branch], activeBranch: branch, loading: false, error: false,
  retry: jest.fn(), setActiveBranch: jest.fn(), canSeeAllBranches: true };
const scopeInput = { uid: scope.uid, businessId: scope.businessId, role: owner.role, branchIds: [], loading: false,
  claimsLoading: false, activeBranch: branch, branchesLoading: false, branchesError: false };
const booking = (id: string, extra: Record<string, unknown> = {}): InsightRecord => ({ id, businessId: scope.businessId,
  branchId: scope.branchId, userId: 'customer-a', serviceName: 'Oil change', status: 'Completed',
  bookingDate: '2026-11-03T10:00:00.000Z', cost: 100, ...extra });
const review = (id: string, extra: Record<string, unknown> = {}): InsightRecord => ({ id, businessId: scope.businessId,
  branchId: scope.branchId, customerName: 'Real customer', service: 'Oil change', date: '2026-11-03T10:00:00.000Z',
  rating: 4, comment: 'A real submitted review.', ...extra });
const snapshot = (records: InsightRecord[] = [], metadata = { fromCache: false, hasPendingWrites: false }) => ({
  docs: records.map((record) => ({ id: record.id, data: () => record })), metadata,
});
const read = getDocsFromServer as jest.Mock;
function deferred() {
  let resolve!: (value: ReturnType<typeof snapshot>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<ReturnType<typeof snapshot>>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now });
  jest.mocked(useAuthContext).mockReturnValue(owner as never);
  jest.mocked(useVendorBranches).mockReturnValue(branchState);
  (auth as unknown as { currentUser: unknown }).currentUser = owner.user;
  read.mockReset().mockResolvedValue(snapshot());
});
afterEach(async () => { await cleanup(); jest.useRealTimers(); });

describe('scope and bounded reads', () => {
  it.each(['business_owner', 'vendor_admin', 'vendor_manager'])('allows %s only for the selected business branch', (role) => {
    expect(resolveInsightScope({ ...scopeInput, role }, 'analytics').scope).toEqual(scope);
    expect(resolveInsightScope({ ...scopeInput, role, activeBranch: { ...branch, businessId: 'foreign' } }, 'analytics').status).toBe('blocked');
  });

  it.each(['customer', 'master_admin', 'vendor_cashier', 'vendor_inventory', 'unknown', 'toString'])('blocks %s without issuing reads', async (role) => {
    jest.mocked(useAuthContext).mockReturnValue({ ...owner, role } as never);
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    expect(result.current.status).toBe('blocked');
    expect(read).not.toHaveBeenCalled();
  });

  it('requires assigned branches for staff and denies staff analytics', () => {
    const staff = { ...scopeInput, role: 'vendor_staff', branchIds: ['branch-a'] };
    expect(resolveInsightScope(staff, 'reviews').scope).toEqual(scope);
    expect(resolveInsightScope({ ...staff, branchIds: ['branch-b'] }, 'reviews').status).toBe('blocked');
    expect(resolveInsightScope(staff, 'analytics').status).toBe('blocked');
  });

  it.each([
    { loading: true }, { claimsLoading: true }, { user: null }, { businessId: null },
  ])('does not query before authenticated claims are available: %j', async (patch) => {
    jest.mocked(useAuthContext).mockReturnValue({ ...owner, ...patch } as never);
    await renderHook(() => useVendorInsights('analytics'));
    expect(read).not.toHaveBeenCalled();
  });

  it.each([{ loading: true }, { error: true }, { activeBranch: null }])('does not query an unresolved branch: %j', async (patch) => {
    jest.mocked(useVendorBranches).mockReturnValue({ ...branchState, ...patch });
    await renderHook(() => useVendorInsights('reviews'));
    expect(read).not.toHaveBeenCalled();
  });

  it.each(['analytics', 'reviews'] as const)('uses both tenant constraints and a bounded server read for %s', async (kind) => {
    const { result } = await renderHook(() => useVendorInsights(kind));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(collection).toHaveBeenCalledWith(expect.anything(), kind === 'analytics' ? 'bookings' : 'reviews');
    expect(where).toHaveBeenCalledWith('businessId', '==', scope.businessId);
    expect(where).toHaveBeenCalledWith('branchId', '==', scope.branchId);
    expect(limit).toHaveBeenCalledWith(INSIGHT_LIMITS[kind] + 1);
    expect(query).toHaveBeenCalledWith({ path: kind === 'analytics' ? 'bookings' : 'reviews' },
      { field: 'businessId', op: '==', value: scope.businessId },
      { field: 'branchId', op: '==', value: scope.branchId }, { limit: INSIGHT_LIMITS[kind] + 1 });
    expect(result.current.records).toEqual([]);
  });

  it('detects a capped result without including the sentinel row', async () => {
    read.mockResolvedValue(snapshot(Array.from({ length: 101 }, (_, i) => review(String(i)))));
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.records).toHaveLength(100);
    expect(result.current.limited).toBe(true);
  });

  it.each([{ fromCache: true, hasPendingWrites: false }, { fromCache: false, hasPendingWrites: true }])('rejects nonauthoritative snapshots: %j', async (metadata) => {
    read.mockResolvedValue(snapshot([review('a')], metadata));
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.records).toEqual([]);
  });

  it('fails closed if the response contains a different tenant', async () => {
    read.mockResolvedValue(snapshot([review('a'), review('foreign', { branchId: 'foreign' })]));
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.records).toEqual([]);
  });
});

describe('aggregation', () => {
  it('uses Qatar calendar boundaries independently of the device timezone', () => {
    const boundary = new Date('2026-11-01T22:00:00Z'); // Monday in Qatar.
    expect(insightPeriodStart('This Week', boundary).toISOString()).toBe('2026-11-01T21:00:00.000Z');
    expect(insightPeriodStart('This Month', boundary).toISOString()).toBe('2026-10-31T21:00:00.000Z');
    expect(insightPeriodStart('This Year', boundary).toISOString()).toBe('2025-12-31T21:00:00.000Z');
  });

  it('aggregates scoped, deduplicated, dated bookings and only completed costs', () => {
    const data = aggregateVendorBookings([
      booking('a', { cost: 19.99 }), booking('a', { cost: 99999 }),
      booking('b', { cost: 0.1, bookingDate: { toDate: () => new Date('2026-11-03T11:00:00Z') } }),
      booking('c', { status: 'Cancelled', cost: 999, bookingDate: new Date('2026-11-03T11:00:00Z') }),
      booking('d', { status: 'Pending', serviceName: 'Brakes' }),
      booking('foreign', { businessId: 'business-b' }), booking('branch-b', { branchId: 'branch-b' }),
      booking('old', { bookingDate: '2026-10-01T10:00:00Z' }), booking('future', { bookingDate: '2026-12-01T10:00:00Z' }),
      booking('bad-date', { bookingDate: null }), booking('bad-status', { status: 'made-up' }),
    ], scope, 'This Week', now);
    expect(data).toMatchObject({ totalBookings: 4, completedBookings: 2, completedValueMinor: 2009,
      averageCompletedValueMinor: 1005, completionRate: 50, excludedRecords: 2, missingCosts: 0 });
    expect(data.topServices).toEqual([{ name: 'Oil change', count: 3 }, { name: 'Brakes', count: 1 }]);
    expect(data.bookingVolume.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(4);
  });

  it.each([undefined, '100', -1, NaN, Infinity, Number.MAX_VALUE])('does not turn invalid completed cost %s into revenue', (cost) => {
    const data = aggregateVendorBookings([booking('a', { cost }), booking('b')], scope, 'This Week', now);
    expect(data.completedValueMinor).toBeNull();
    expect(data.averageCompletedValueMinor).toBeNull();
    expect(data.missingCosts).toBe(1);
  });

  it('handles empty periods and missing values without NaN or synthetic bookings', () => {
    const data = aggregateVendorBookings([], scope, 'This Week', now);
    expect(data).toMatchObject({ totalBookings: 0, completionRate: null, averageCompletedValueMinor: null, completedValueMinor: 0 });
    expect(data.bookingVolume.every((bucket) => bucket.count === 0)).toBe(true);
    expect(aggregateVendorReviews([], scope)).toMatchObject({ averageRating: null, reviews: [] });
  });

  it('changes the period using actual booking dates, including the exact start boundary', () => {
    const rows = [booking('start', { bookingDate: '2026-11-01T21:00:00Z' }),
      booking('month', { bookingDate: '2026-10-31T21:00:00Z' }), booking('year', { bookingDate: '2026-02-01T00:00:00Z' })];
    expect(aggregateVendorBookings(rows, scope, 'This Week', now).totalBookings).toBe(1);
    expect(aggregateVendorBookings(rows, scope, 'This Month', now).totalBookings).toBe(2);
    expect(aggregateVendorBookings(rows, scope, 'This Year', now).totalBookings).toBe(3);
  });

  it('summarizes only valid scoped reviews and preserves real vendorReply fields', () => {
    const result = aggregateVendorReviews([
      review('a', { rating: 5, vendorReply: 'Thank you', date: '2026-11-04T00:00:00Z' }), review('a'),
      review('b', { rating: 1, date: null, customerName: undefined }),
      review('c', { rating: 0 }), review('d', { rating: 3.5 }), review('e', { rating: '5' }),
      review('foreign', { businessId: 'foreign' }), review('other', { branchId: 'foreign' }),
    ], scope);
    expect(result.averageRating).toBe(3);
    expect(result.excludedRecords).toBe(3);
    expect(result.reviews).toHaveLength(2);
    expect(result.reviews[0].vendorReply).toBe('Thank you');
    expect(result.reviews[1]).toMatchObject({ customerName: 'Customer', date: null });
    expect(result.distribution.map((bucket) => bucket.count)).toEqual([1, 0, 0, 0, 1]);
  });
});

describe('stale requests and retry', () => {
  it('ignores a late prior-business response and clears data before replacement', async () => {
    const old = deferred(); const next = deferred();
    read.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const { result, rerender } = await renderHook(() => useVendorInsights('reviews'));
    jest.mocked(useAuthContext).mockReturnValue({ ...owner, businessId: 'business-b' } as never);
    jest.mocked(useVendorBranches).mockReturnValue({ ...branchState, activeBranch: { ...branch, id: 'branch-b', businessId: 'business-b' } });
    await rerender({});
    await act(async () => old.resolve(snapshot([review('old')])));
    expect(result.current.records).toEqual([]);
    expect(result.current.status).toBe('loading');
    await act(async () => next.resolve(snapshot([review('new', { businessId: 'business-b', branchId: 'branch-b' })])));
    expect(result.current.records.map((record) => record.id)).toEqual(['new']);
  });

  it.each(['branch', 'account', 'role', 'claims', 'signout'])('hides already-loaded records immediately on %s changes', async (change) => {
    read.mockResolvedValueOnce(snapshot([review('old')])).mockImplementation(() => new Promise(() => {}));
    const renders: string[][] = [];
    const { result, rerender } = await renderHook(() => {
      const value = useVendorInsights('reviews'); renders.push(value.records.map((record) => record.id)); return value;
    });
    await waitFor(() => expect(result.current.records).toHaveLength(1));
    renders.length = 0;
    if (change === 'branch') jest.mocked(useVendorBranches).mockReturnValue({ ...branchState, activeBranch: { ...branch, id: 'branch-b' } });
    if (change === 'account') {
      jest.mocked(useAuthContext).mockReturnValue({ ...owner, user: { uid: 'owner-b' } } as never);
      (auth as unknown as { currentUser: unknown }).currentUser = { uid: 'owner-b' };
    }
    if (change === 'role') jest.mocked(useAuthContext).mockReturnValue({ ...owner, role: 'vendor_cashier' } as never);
    if (change === 'claims') jest.mocked(useAuthContext).mockReturnValue({ ...owner, claimsLoading: true } as never);
    if (change === 'signout') {
      jest.mocked(useAuthContext).mockReturnValue({ ...owner, user: null } as never);
      (auth as unknown as { currentUser: unknown }).currentUser = null;
    }
    await rerender({});
    expect(renders.every((records) => records.length === 0)).toBe(true);
    expect(result.current.records).toEqual([]);
  });

  it('blocks stale staff branch assignments even if the shared branch hook still has metadata', async () => {
    jest.mocked(useAuthContext).mockReturnValue({ ...owner, role: 'vendor_staff', branchIds: ['branch-b'] } as never);
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    expect(result.current.status).toBe('blocked');
    expect(read).not.toHaveBeenCalled();
  });

  it('checks the Firebase identity again when a server request resolves', async () => {
    const pending = deferred(); read.mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    (auth as unknown as { currentUser: unknown }).currentUser = { uid: 'owner-b' };
    await act(async () => pending.resolve(snapshot([review('old')])));
    expect(result.current.status).toBe('error');
    expect(result.current.records).toEqual([]);
  });

  it('retries failures with a fresh read and no retained result', async () => {
    const retry = deferred();
    read.mockRejectedValueOnce(new Error('permission-denied')).mockReturnValueOnce(retry.promise);
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    await act(() => result.current.retry());
    expect(result.current.records).toEqual([]);
    await act(async () => retry.resolve(snapshot([review('new')])));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(read).toHaveBeenCalledTimes(2);
    expect(result.current.records[0].id).toBe('new');
  });

  it('does not let a stale retry failure overwrite a successful new attempt', async () => {
    const old = deferred(); read.mockReturnValueOnce(old.promise).mockResolvedValueOnce(snapshot([review('new')]));
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    await act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => old.reject(new Error('late failure')));
    expect(result.current.records[0].id).toBe('new');
    expect(result.current.status).toBe('ready');
  });

  it('times out, ignores late success, and recovers on retry', async () => {
    const old = deferred(); read.mockReturnValueOnce(old.promise).mockResolvedValueOnce(snapshot());
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    await act(() => jest.advanceTimersByTime(INSIGHT_TIMEOUT_MS));
    expect(result.current.status).toBe('error');
    await act(async () => old.resolve(snapshot([review('late')])));
    expect(result.current.records).toEqual([]);
    await act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.records).toEqual([]);
  });

  it('cleans up the deadline on unmount and ignores the outstanding request', async () => {
    const pending = deferred(); read.mockReturnValue(pending.promise);
    const { result, unmount } = await renderHook(() => useVendorInsights('reviews'));
    await unmount();
    await act(async () => pending.resolve(snapshot([review('late')])));
    expect(result.current.records).toEqual([]);
  });

  it('retries failed branch metadata without issuing an unscoped query', async () => {
    jest.mocked(useVendorBranches).mockReturnValue({ ...branchState, error: true });
    const { result } = await renderHook(() => useVendorInsights('reviews'));
    await act(() => result.current.retry());
    expect(branchState.retry).toHaveBeenCalledTimes(1);
    expect(read).not.toHaveBeenCalled();
  });
});

describe('native screens', () => {
  it.each([['analytics', AnalyticsScreen], ['reviews', ReviewsScreen]] as const)('shows loading, error/retry and confirmed empty states for %s', async (kind, Component) => {
    const pending = deferred(); read.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(snapshot());
    await render(<Component />);
    expect(screen.getByLabelText(`Loading ${kind}`)).toBeTruthy();
    expect(screen.queryByText(/No (bookings in this period|reviews yet)/)).toBeNull();
    await act(async () => pending.reject(new Error('unavailable')));
    expect(screen.queryByText(/No (bookings in this period|reviews yet)/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getByText(kind === 'analytics' ? 'No bookings in this period' : 'No reviews yet')).toBeTruthy());
  });

  it('shows actual reviews and persists replies before refreshing', async () => {
    read.mockResolvedValue(snapshot([review('a', { vendorReply: 'Persisted reply' })]));
    await render(<ReviewsScreen />);
    await waitFor(() => expect(screen.getByText('A real submitted review.')).toBeTruthy());
    expect(screen.getByText('Persisted reply')).toBeTruthy();
    expect(screen.getByLabelText('Average rating 4.0 out of 5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit reply' }));
    await fireEvent.changeText(screen.getByLabelText('Review reply'), 'Thank you for visiting.');
    jest.mocked(saveVendorReviewReply).mockResolvedValueOnce(undefined);
    await fireEvent.press(screen.getByRole('button', { name: 'Save reply' }));
    await waitFor(() => expect(saveVendorReviewReply).toHaveBeenCalledWith(scope, 'a', 'Thank you for visiting.'));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  });

  it('preserves a failed reply draft without showing a saved reply', async () => {
    read.mockResolvedValue(snapshot([review('a')]));
    jest.mocked(saveVendorReviewReply).mockRejectedValueOnce(new Error('offline'));
    await render(<ReviewsScreen />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reply' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Reply' }));
    await fireEvent.changeText(screen.getByLabelText('Review reply'), 'My draft');
    await fireEvent.press(screen.getByRole('button', { name: 'Save reply' }));
    await waitFor(() => expect(screen.getByText(/Reply was not saved/)).toBeTruthy());
    expect(screen.getByDisplayValue('My draft')).toBeTruthy();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('updates analytics for selected periods without sample conversion or retention metrics', async () => {
    read.mockResolvedValue(snapshot([booking('week'), booking('month', { bookingDate: '2026-11-01T10:00:00Z', cost: 50 })]));
    await render(<AnalyticsScreen />);
    await waitFor(() => expect(screen.getAllByText('QAR 100.00')).toHaveLength(2));
    await fireEvent.press(screen.getByRole('tab', { name: 'This Month' }));
    expect(screen.getByText('QAR 150.00')).toBeTruthy();
    expect(screen.getByText('QAR 75.00')).toBeTruthy();
    expect(screen.queryByText('Conversion Funnel')).toBeNull();
    expect(screen.queryByText('Repeat Customer Rate')).toBeNull();
  });

  it('withholds capped analytics instead of displaying partial totals', async () => {
    read.mockResolvedValue(snapshot(Array.from({ length: 501 }, (_, i) => booking(String(i)))));
    await render(<AnalyticsScreen />);
    await waitFor(() => expect(screen.getByText(/Complete analytics are unavailable/)).toBeTruthy());
    expect(screen.queryByText('Completed booking value')).toBeNull();
    expect(screen.queryByText('No bookings in this period')).toBeNull();
  });

  it('labels capped review summaries as loaded data, not lifetime counts or latest reviews', async () => {
    read.mockResolvedValue(snapshot(Array.from({ length: 101 }, (_, i) => review(String(i)))));
    await render(<ReviewsScreen />);
    await waitFor(() => expect(screen.getByText('100 loaded reviews')).toBeTruthy());
    expect(screen.getByText(/not necessarily the latest/)).toBeTruthy();
    expect(screen.getAllByText('A real submitted review.').length).toBeLessThan(100);
  });
});
