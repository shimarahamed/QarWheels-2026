import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import VendorDashboard from '@/app/vendor/dashboard';
import { useQarWheelStore } from '@/lib/store';
import { VendorFeedStatusContext } from '@/lib/vendor-feed-status';
import type { VendorBooking } from '@/lib/vendor-data';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/components/vendor/BranchSwitcher', () => ({ BranchSwitcher: () => null }));
jest.mock('@/components/VendorTabBar', () => ({ VendorTabBar: () => null, useVendorTabBottom: () => 70 }));
jest.mock('@/lib/vendorQueries', () => ({ useVendorBranches: () => ({ activeBranch: { name: 'Test Workshop' } }) }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

function booking(id: string, status: VendorBooking['status'] = 'Pending'): VendorBooking {
  return {
    id, customerName: `Customer ${id}`, customerPhone: '', vehicle: 'Toyota', vehiclePlate: 'QA 123',
    service: `Service ${id}`, serviceCategory: 'repair', date: 'Today', timeSlot: '10:00 AM',
    status, totalAmount: 0, chatId: `chat_${id}`, createdAt: '2026-11-04T09:00:00Z',
  };
}

function dashboard(loading = false, error = false) {
  return <VendorFeedStatusContext.Provider value={{ loading, error, retry: jest.fn() }}><VendorDashboard /></VendorFeedStatusContext.Provider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  useQarWheelStore.getState().clearPersonalData();
});
afterEach(cleanup);

it('uses actual booking counts and never renders fabricated activity or revenue', async () => {
  useQarWheelStore.setState({ vendorBookings: [booking('a'), booking('b', 'InProgress'), booking('c', 'Cancelled')] });
  await render(dashboard());

  expect(screen.getByRole('button', { name: 'Today: 2. Open bookings' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Pending: 1. Open new requests' })).toBeTruthy();
  expect(screen.getByText('Customer a')).toBeTruthy();
  expect(screen.queryByText('Customer c')).toBeNull();
  expect(screen.queryByText('Recent Activity')).toBeNull();
  expect(screen.queryByText('QAR 1,640')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'View all bookings' }));
  expect(mockPush).toHaveBeenCalledWith('/vendor/bookings');
});

it('bounds the dashboard preview and distinguishes loading from an empty day', async () => {
  const { rerender } = await render(dashboard(true));
  expect(screen.getByLabelText("Loading today's bookings")).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Pending: loading. Open new requests' })).toBeTruthy();
  expect(screen.queryByText('No bookings today')).toBeNull();

  await rerender(dashboard(false, true));
  expect(screen.getByRole('button', { name: 'Pending: unavailable. Open new requests' })).toBeTruthy();
  expect(screen.queryByText('No bookings today')).toBeNull();

  await rerender(dashboard(false));
  expect(screen.getByText('No bookings today')).toBeTruthy();

  await act(() => useQarWheelStore.setState({ vendorBookings: Array.from({ length: 8 }, (_, i) => booking(String(i))) }));
  expect(screen.getByText('Customer 0')).toBeTruthy();
  expect(screen.queryByText('Customer 7')).toBeNull();
});
