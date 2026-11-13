import * as Notifications from 'expo-notifications';
import { apiPost } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { useQarWheelStore } from '@/lib/store';
import { advanceBookingStatus } from '@/lib/vendorOps';
import type { VendorBooking } from '@/lib/vendor-data';

jest.mock('@/lib/api', () => ({ apiPost: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(auth, { currentUser: { getIdToken: jest.fn().mockResolvedValue('token') } });
  useQarWheelStore.setState({
    vendorBookings: [{ id: 'booking_1', status: 'Confirmed' } as VendorBooking],
    bookings: [], notifications: [],
  });
});

it('rolls back a rejected vendor transition without announcing a false status', async () => {
  jest.mocked(apiPost).mockRejectedValue(new Error('Transition rejected'));
  await expect(advanceBookingStatus('booking_1', 'Confirmed')).rejects.toThrow('Transition rejected');
  expect(useQarWheelStore.getState().vendorBookings[0].status).toBe('Confirmed');
  expect(useQarWheelStore.getState().notifications).toEqual([]);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('leaves customer push to the server after a committed transition', async () => {
  jest.mocked(apiPost).mockResolvedValue({ status: 'VehicleReceived', from: 'Confirmed' });
  await advanceBookingStatus('booking_1', 'Confirmed');
  expect(useQarWheelStore.getState().vendorBookings[0].status).toBe('VehicleReceived');
  expect(useQarWheelStore.getState().notifications).toEqual([]);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('does not treat an old demo-prefixed booking as a successful server transition', async () => {
  useQarWheelStore.setState({ vendorBookings: [{ id: 'vb_001', status: 'Confirmed' } as VendorBooking] });
  jest.mocked(apiPost).mockRejectedValue(new Error('Booking not found'));
  await expect(advanceBookingStatus('vb_001', 'Confirmed')).rejects.toThrow('Booking not found');
  expect(apiPost).toHaveBeenCalledWith('/api/bookings/vb_001/transition', 'token', { status: 'VehicleReceived' });
  expect(useQarWheelStore.getState().vendorBookings[0].status).toBe('Confirmed');
});
