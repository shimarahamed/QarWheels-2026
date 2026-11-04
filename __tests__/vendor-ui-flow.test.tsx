import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import VendorBookings from '@/app/vendor/bookings';
import ServicesScreen from '@/app/vendor/services';
import BookingDetailScreen from '@/app/vendor/booking-detail/[id]';
import StatusUpdateScreen from '@/app/vendor/status-update/[id]';
import CustomerScreen from '@/app/vendor/customer/[id]';
import AssignStaffScreen from '@/app/vendor/assign-staff/[id]';
import { VendorAuthGate } from '@/components/AuthGate';
import { useAuthContext } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';
import { useQarWheelStore } from '@/lib/store';
import { VendorFeedStatusContext } from '@/lib/vendor-feed-status';
import type { VendorBooking, VendorService } from '@/lib/vendor-data';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => ({ id: 'missing' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/components/vendor/BranchSwitcher', () => ({ BranchSwitcher: () => null }));
jest.mock('@/components/vendor/BookingActionSheet', () => ({ BookingActionSheet: () => null }));
jest.mock('@/components/VendorTabBar', () => {
  const { View } = require('react-native');
  return { VendorTabBar: () => <View testID="vendor-navigation" />, useVendorTabBottom: () => 70 };
});
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));
const retry = jest.fn();
const session = { user: { uid: 'vendor' }, claims: { r: 'vendor_staff', b: 'business', br: ['branch'] },
  claimsLoading: false, loading: false, refreshClaims: jest.fn() };
const booking = (id: string, status: VendorBooking['status'] = 'Pending'): VendorBooking => ({
  id, customerName: `Customer ${id}`, customerPhone: '', service: `Service ${id}`, serviceCategory: 'repair',
  vehicle: 'Toyota', vehiclePlate: '123', date: 'Today', timeSlot: '10:00', status, totalAmount: 100,
  chatId: `chat_${id}`, createdAt: '2026-11-02T00:00:00Z',
});
const service = (id: string): VendorService => ({ id, name: `Service ${id}`, category: 'Maintenance', basePrice: 100,
  duration: 45, description: '', active: true });
beforeEach(() => {
  jest.clearAllMocks();
  useQarWheelStore.getState().clearPersonalData();
  jest.mocked(useAuthContext).mockReturnValue(session as never);
  Object.assign(auth, { currentUser: session.user });
  session.refreshClaims.mockResolvedValue(undefined);
});
afterEach(cleanup);
function bookingsView(loading = false, error = false) {
  return <VendorFeedStatusContext.Provider value={{ loading, error, retry }}><VendorBookings /></VendorFeedStatusContext.Provider>;
}

it('distinguishes loading and failed feeds from a confirmed empty branch', async () => {
  const { rerender } = await render(bookingsView(true));
  expect(screen.getByLabelText('Loading vendor bookings')).toBeTruthy();
  expect(screen.queryByText('No bookings')).toBeNull();
  await rerender(bookingsView(false, true));
  expect(screen.queryByText('No bookings')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /retry/i }));
  expect(retry).toHaveBeenCalledTimes(1);
  await rerender(bookingsView());
  expect(screen.getByText('No bookings')).toBeTruthy();
});

it('virtualizes thousands of bookings instead of mounting every card', async () => {
  useQarWheelStore.setState({ vendorBookings: Array.from({ length: 3000 }, (_, i) => booking(String(i))) });
  await render(bookingsView());
  expect(screen.getByText('3000 bookings')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^View booking/ }).length).toBeLessThan(100);
});

it('provides declined and missed filters and independent booking actions', async () => {
  useQarWheelStore.setState({ vendorBookings: [booking('a'), booking('b', 'Declined'), booking('c', 'NoShow')] });
  await render(bookingsView());
  await fireEvent.press(screen.getByRole('button', { name: 'Message Customer a' }));
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith('/vendor/chat/chat_a');
  await fireEvent.press(screen.getByRole('tab', { name: 'Declined, 1 bookings' }));
  expect(screen.getByText('Service b')).toBeTruthy();
  expect(screen.queryByText('Service a')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: 'Missed, 1 bookings' }));
  expect(screen.getByText('Service c')).toBeTruthy();
});

it.each([BookingDetailScreen, StatusUpdateScreen, AssignStaffScreen, CustomerScreen])('handles absent records without sample fallback or crashing', async (Component) => {
  await render(<Component />);
  await fireEvent.press(screen.getByRole('button', { name: 'Back to bookings' }));
  expect(mockReplace).toHaveBeenCalledWith('/vendor/bookings');
});

it('loads each service into a fresh editor and preserves navigation', async () => {
  useQarWheelStore.setState({ vendorServices: [service('a'), service('b')] });
  await render(<ServicesScreen />);
  expect(screen.getByTestId('vendor-navigation')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Service a' }));
  expect(screen.getByDisplayValue('Service a')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Service name'), 'Unsaved draft');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Service b' }));
  expect(screen.getByDisplayValue('Service b')).toBeTruthy();
  expect(screen.queryByDisplayValue('Unsaved draft')).toBeNull();
});

it('rejects non-finite prices and fractional minutes without closing the editor', async () => {
  useQarWheelStore.setState({ vendorServices: [service('a')] });
  await render(<ServicesScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Service a' }));
  await fireEvent.changeText(screen.getByLabelText('Price in QAR'), 'Infinity');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByText('Enter a valid price.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Price in QAR'), '125');
  await fireEvent.changeText(screen.getByLabelText('Duration in minutes'), '1.5');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByText(/whole number of minutes/)).toBeTruthy();
  expect(useQarWheelStore.getState().vendorServices[0].basePrice).toBe(100);
  await fireEvent.changeText(screen.getByLabelText('Duration in minutes'), '60');
  await act(async () => await fireEvent.press(screen.getByRole('button', { name: 'Save changes' })));
  expect(useQarWheelStore.getState().vendorServices[0].basePrice).toBe(125);
});

it('shows a recoverable access explanation instead of bouncing customer accounts between routes', async () => {
  jest.mocked(useAuthContext).mockReturnValue({ ...session, claims: null } as never);
  await render(<VendorAuthGate><Text>Private vendor content</Text></VendorAuthGate>);
  expect(screen.queryByText('Private vendor content')).toBeNull();
  expect(screen.getByText('Vendor access unavailable')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Check access again' }));
  await waitFor(() => expect(session.refreshClaims).toHaveBeenCalledTimes(1));
  await fireEvent.press(screen.getByRole('button', { name: 'Back to customer app' }));
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
});
