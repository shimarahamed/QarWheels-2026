import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { onSnapshot } from 'firebase/firestore';
import { BookingDetailScreen } from '@/components/DetailScreens';
import { useQarWheelStore } from '@/lib/store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'booking-1' }),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/components/RemoteImage', () => ({ RemoteImage: () => null }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ user: { uid: 'customer-1' } }) }));

beforeEach(() => {
  mockPush.mockClear();
  useQarWheelStore.setState({
    bookings: [{
      id: 'booking-1', vendorBookingId: 'booking-1', garageId: 'garage-1',
      garage: 'Doha Workshop', service: 'Brake inspection', vehicle: 'My car',
      date: 'Nov 7, 10:00 AM', status: 'Pending', totalAmount: 0,
    }] as never,
    vendorInvoices: [],
  });
});

it('routes follow-up actions to the garage instead of a dead calendar or notifications', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<BookingDetailScreen />);
  expect(screen.queryByText('Calendar')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Message garage' }));
  expect(mockPush).toHaveBeenLastCalledWith('/chat/garage-1');
  await fireEvent.press(screen.getByRole('button', { name: 'View Doha Workshop garage' }));
  expect(mockPush).toHaveBeenLastCalledWith('/garage/garage-1');
  await fireEvent.press(screen.getByRole('button', { name: 'Ask garage for a new time' }));
  const actions = alert.mock.calls.at(-1)?.[2];
  expect(actions).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'Message garage' })]));
  actions?.find((action) => action.text === 'Message garage')?.onPress?.();
  expect(mockPush).toHaveBeenLastCalledWith('/chat/garage-1');
  alert.mockRestore();
});

it('updates the detail status from the live quote booking record', async () => {
  const sendSnapshot = (_ref: unknown, next: unknown) => {
    (next as (snapshot: unknown) => void)({
      id: 'booking-1',
      exists: () => true,
      data: () => ({ status: 'Confirmed', userId: 'customer-1', branchName: 'Doha Workshop', branchId: 'garage-1',
        serviceName: 'Brake inspection', carDescription: 'My car', bookingDate: '2026-11-11', quote: {
        revision: 1, status: 'Accepted', amountMinorUnits: 10000, currency: 'QAR',
        description: 'Brake inspection', offeredAt: '2026-11-11', offeredBy: 'vendor-1',
        requestId: 'request-1', acceptedBy: 'customer-1',
      } }),
    });
    return jest.fn();
  };
  jest.mocked(onSnapshot).mockImplementationOnce(sendSnapshot as never).mockImplementationOnce(sendSnapshot as never);
  await render(<BookingDetailScreen />);
  expect(screen.getByText('Confirmed')).toBeTruthy();
  expect(screen.getByText('Accepted by the customer')).toBeTruthy();
});

it('opens a direct booking link even when the list feed has not loaded', async () => {
  useQarWheelStore.setState({ bookings: [] });
  jest.mocked(onSnapshot).mockImplementationOnce((_ref, next) => {
    (next as (snapshot: unknown) => void)({
      id: 'booking-1', exists: () => true,
      data: () => ({ userId: 'customer-1', branchName: 'Doha Workshop', branchId: 'garage-1',
        serviceName: 'Brake inspection', carDescription: 'My car', bookingDate: '2026-11-11', status: 'Pending' }),
    });
    return jest.fn();
  });
  await render(<BookingDetailScreen />);
  expect(screen.getByText('Brake inspection')).toBeTruthy();
});

it('does not display a direct booking record owned by another user', async () => {
  useQarWheelStore.setState({ bookings: [] });
  jest.mocked(onSnapshot).mockImplementationOnce((_ref, next) => {
    (next as (snapshot: unknown) => void)({
      id: 'booking-1', exists: () => true,
      data: () => ({ userId: 'other-customer', serviceName: 'Private job', status: 'Pending' }),
    });
    return jest.fn();
  });
  await render(<BookingDetailScreen />);
  expect(screen.getByText('Booking not found')).toBeTruthy();
  expect(screen.queryByText('Private job')).toBeNull();
});
