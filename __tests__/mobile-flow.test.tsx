import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SearchScreen, BookingsScreen } from '@/components/Marketplace';
import { ServiceListingsScreen } from '@/components/MarketplaceDiscovery';
import { useBranches, useFirestoreBookings } from '@/lib/firestoreOps';
import { useQarWheelStore } from '@/lib/store';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush, replace: mockReplace, canGoBack: () => false, back: jest.fn() }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ user: { uid: 'customer-a' } }) }));
jest.mock('@/lib/firestoreOps', () => ({ useBranches: jest.fn(), useFirestoreBookings: jest.fn(), cancelBooking: jest.fn() }));
jest.mock('@/lib/session', () => ({ signOutCompletely: jest.fn() }));
jest.mock('@/components/RemoteImage', () => ({ RemoteImage: () => null }));
// Native telemetry starts an import-time interval unrelated to these screens.
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

const garage = (id: number) => ({ id: `garage-${id}`, name: `Garage ${id}`, type: 'AC specialist',
  area: id % 2 ? 'Doha' : 'Lusail', category: 'ac', tags: [], rating: 4, reviews: 10,
  responseTime: '20 min', startingPrice: 'QAR 100', verified: false, openNow: true });
const refresh = jest.fn(async () => {});
const loadMore = jest.fn();
async function renderMarketplace(ui: React.ReactElement) {
  await render(ui);
  await act(() => jest.advanceTimersByTime(100));
}
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
  jest.clearAllMocks();
  useQarWheelStore.getState().clearPersonalData();
  jest.mocked(useBranches).mockReturnValue({ vendors: [], jobs: [], loading: false, error: false, refresh });
  jest.mocked(useFirestoreBookings).mockReturnValue({ bookings: [], loading: false, loadingMore: false, hasMore: false, error: false, refresh, loadMore });
});

afterEach(async () => {
  await cleanup();
  try {
    await act(async () => { jest.runOnlyPendingTimers(); });
  } finally {
    jest.useRealTimers();
  }
});

it('does not mount thousands of garage rows at once', async () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: Array.from({ length: 5000 }, (_, i) => garage(i)) as never, jobs: [], loading: false, error: false, refresh });
  await renderMarketplace(<SearchScreen />);
  await act(async () => { jest.advanceTimersByTime(100); });
  expect(screen.getAllByText(/^Garage \d+$/).length).toBeLessThan(100);
  expect(screen.getByText('5000 garages')).toBeTruthy();
});

it('keeps garage navigation and save as independent actions', async () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: [garage(1)] as never, jobs: [], loading: false, error: false, refresh });
  await renderMarketplace(<SearchScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Save Garage 1' }));
  expect(useQarWheelStore.getState().favoriteGarageIds).toContain('garage-1');
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'View Garage 1' }));
  expect(mockPush).toHaveBeenCalledWith('/garage/garage-1');
});

it('keeps service details and checkout as independent actions', async () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: [], jobs: [{ id: 'oil-change', title: 'Oil change', price: 'QAR 100', priceValue: 100,
    availability: 'On request' }] as never, loading: false, error: false, refresh });
  await renderMarketplace(<ServiceListingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Book Oil change' }));
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/checkout/oil-change');
  mockPush.mockClear();
  await fireEvent.press(screen.getByRole('button', { name: 'View Oil change details' }));
  expect(mockPush).toHaveBeenCalledWith('/service/oil-change');
});

it('searches multiple terms and uses only genuine submitted recent searches', async () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: [garage(1), garage(2)] as never, jobs: [], loading: false, error: false, refresh });
  await renderMarketplace(<SearchScreen />);
  expect(screen.queryByText('Recent searches')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Search garages'), 'Doha AC');
  await waitFor(() => expect(screen.getByText('1 garages')).toBeTruthy());
  expect(screen.queryByText('Garage 2')).toBeNull();
  await fireEvent(screen.getByLabelText('Search garages'), 'submitEditing');
  await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
  await waitFor(() => expect(screen.getByText('Recent searches')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Remove search Doha AC' }));
  expect(screen.queryByText('Recent searches')).toBeNull();
});

it('shows a retry action instead of disguising a load failure as no results', async () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: [], jobs: [], loading: false, error: true, refresh });
  await renderMarketplace(<SearchScreen />);
  expect(screen.queryByText('No garages listed yet')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /retry/i }));
  expect(refresh).toHaveBeenCalled();
});

it('puts declined and missed appointments in history, not active bookings', async () => {
  const base = { garage: 'Real garage', garageId: 'garage-a', vehicle: 'My car', date: '2026-10-31', bookingDate: '2026-10-31' };
  jest.mocked(useFirestoreBookings).mockReturnValue({ bookings: [
    { ...base, id: 'a', status: 'Declined', service: 'Declined service' },
    { ...base, id: 'b', status: 'NoShow', service: 'Missed service' },
    { ...base, id: 'c', status: 'Pending', service: 'Pending service' },
  ] as never, loading: false, loadingMore: false, hasMore: false, error: false, refresh, loadMore });
  await renderMarketplace(<BookingsScreen />);
  expect(screen.queryByText('Declined service')).toBeNull();
  expect(screen.getByText('Pending service')).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: 'History, 2 bookings' }));
  expect(screen.getByText('Declined service')).toBeTruthy();
  expect(screen.getByText('Missed service')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cancel Declined service' })).toBeDisabled();
});

it('starts new bookings with garage selection and messages the actual garage', async () => {
  jest.mocked(useFirestoreBookings).mockReturnValue({ bookings: [{ id: 'booking-a', status: 'Pending', garage: 'Real garage', garageId: 'garage-a', service: 'Oil change', vehicle: 'My car', date: '2026-10-31' }] as never, loading: false, loadingMore: false, hasMore: false, error: false, refresh, loadMore });
  await renderMarketplace(<BookingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Message Real garage' }));
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/chat/garage-a');
  await fireEvent.press(screen.getByRole('button', { name: 'View Oil change booking at Real garage' }));
  expect(mockPush).toHaveBeenLastCalledWith('/booking/booking-a');
  await fireEvent.press(screen.getByRole('button', { name: /New booking/ }));
  expect(mockPush).toHaveBeenLastCalledWith('/search');
});

it('offers a real contact path for a reschedule request without changing the booking', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(useFirestoreBookings).mockReturnValue({ bookings: [{ id: 'booking-a', status: 'Pending', garage: 'Real garage', garageId: 'garage-a', service: 'Oil change', vehicle: 'My car', date: '2026-10-31' }] as never, loading: false, loadingMore: false, hasMore: false, error: false, refresh, loadMore });
  try {
    await renderMarketplace(<BookingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ask to reschedule Oil change' }));
    expect(alert).toHaveBeenCalledWith('Ask for a new time', expect.stringContaining('stays unchanged'), expect.any(Array));
    const actions = alert.mock.calls[0][2] ?? [];
    await act(() => actions[1]?.onPress?.());
    expect(mockPush).toHaveBeenCalledWith('/chat/garage-a');
  } finally {
    alert.mockRestore();
  }
});

it('loads older customer bookings only from an explicit footer action', async () => {
  jest.mocked(useFirestoreBookings).mockReturnValue({ bookings: [], loading: false, loadingMore: false, hasMore: true, error: false, refresh, loadMore });
  await renderMarketplace(<BookingsScreen />);
  expect(loadMore).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Load older bookings' }));
  expect(loadMore).toHaveBeenCalledTimes(1);
});
