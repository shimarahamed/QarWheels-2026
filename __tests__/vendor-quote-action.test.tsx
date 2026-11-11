import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { BookingActionSheet } from '@/components/vendor/BookingActionSheet';
import type { VendorBooking } from '@/lib/vendor-data';
import { apiPost } from '@/lib/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/api', () => ({ apiPost: jest.fn() }));

afterEach(cleanup);

it('opens quote review instead of confirming a pending booking directly', async () => {
  await render(<BookingActionSheet booking={{ id: 'booking_1', status: 'Pending' } as VendorBooking} compact />);
  await fireEvent.press(screen.getByRole('button', { name: 'Review booking quote' }));
  expect(mockPush).toHaveBeenCalledWith('/vendor/booking-detail/booking_1');
  expect(apiPost).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Accept booking' })).toBeNull();
});
