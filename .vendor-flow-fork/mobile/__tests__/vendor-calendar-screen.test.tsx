import { fireEvent, render, screen } from '@testing-library/react-native';
import VendorCalendar from '@/app/vendor/calendar';
import { VendorFeedStatusContext } from '@/lib/vendor-feed-status';
import { useQarWheelStore } from '@/lib/store';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/components/VendorTabBar', () => ({ VendorTabBar: () => null, useVendorTabBottom: () => 60 }));

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-11-06T08:00:00.000Z') });
  mockPush.mockClear();
  useQarWheelStore.setState({
    vendorBookings: [{
      id: 'request-1', customerName: 'Customer A', vehicle: 'Car', vehiclePlate: 'QA 123',
      service: 'Brake inspection', serviceCategory: 'repair', date: 'Today',
      bookingDate: '2026-11-06T07:00:00.000Z', timeSlot: '10:00 AM',
      status: 'Pending', totalAmount: 0, chatId: 'chat-1', createdAt: '2026-11-05T12:00:00.000Z',
      customerPhone: '',
    }] as never,
  });
});
afterEach(() => jest.useRealTimers());

it('shows dated requests without invented capacity and opens the real settings route', async () => {
  await render(<VendorFeedStatusContext.Provider value={{ loading: false, error: false, retry: jest.fn() }}><VendorCalendar /></VendorFeedStatusContext.Provider>);
  expect(screen.getByText('1 request · Today')).toBeTruthy();
  expect(screen.getByText('Times are preferences until confirmed by the garage.')).toBeTruthy();
  expect(screen.queryByText(/slots booked|Hour Overview|Block/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Workshop hours and settings' }));
  expect(mockPush).toHaveBeenCalledWith('/vendor/settings');
  await fireEvent.press(screen.getByRole('tab', { name: /Sat, Nov 7, 0 requests/ }));
  expect(screen.getByText('No dated requests')).toBeTruthy();
});
