import { fireEvent, render, screen } from '@testing-library/react-native';
import { BookingsScreen } from '@/components/Marketplace';
import { useFirestoreBookings } from '@/lib/firestoreOps';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ user: { uid: 'customer-a' } }) }));
jest.mock('@/lib/firestoreOps', () => ({ useFirestoreBookings: jest.fn() }));
jest.mock('@/components/RemoteImage', () => ({ RemoteImage: () => null }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

it('replaces a failed pagination action with retry and restores it after recovery', async () => {
  const refresh = jest.fn();
  const loadMore = jest.fn();
  const feed = {
    bookings: [{ id: 'booking-a', status: 'Pending', garage: 'Real garage', garageId: 'garage-a', service: 'Oil change', vehicle: 'My car', date: '2026-10-31' }] as never,
    loading: false, loadingMore: false, hasMore: true, error: false, refresh, loadMore,
  };
  jest.mocked(useFirestoreBookings).mockReturnValue(feed);
  const { rerender } = await render(<BookingsScreen />);
  expect(screen.getByRole('button', { name: 'Load older bookings' })).toBeTruthy();

  jest.mocked(useFirestoreBookings).mockReturnValue({ ...feed, error: true });
  await rerender(<BookingsScreen />);
  expect(screen.getByText('Oil change')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Load older bookings' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /retry/i }));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(loadMore).not.toHaveBeenCalled();

  jest.mocked(useFirestoreBookings).mockReturnValue({ ...feed, loading: true });
  await rerender(<BookingsScreen />);
  expect(screen.queryByRole('button', { name: 'Load older bookings' })).toBeNull();

  jest.mocked(useFirestoreBookings).mockReturnValue(feed);
  await rerender(<BookingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Load older bookings' }));
  expect(loadMore).toHaveBeenCalledTimes(1);
});
