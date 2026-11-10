import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { BookingDetailScreen } from '@/components/DetailScreens';
import { useQarWheelStore } from '@/lib/store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'booking-1' }),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/components/RemoteImage', () => ({ RemoteImage: () => null }));

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
