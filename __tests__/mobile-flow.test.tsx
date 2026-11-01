import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SearchScreen, BookingsScreen } from '@/components/Marketplace';
import { useBranches, useFirestoreBookings } from '@/lib/firestoreOps';
import { useQarWheelStore } from '@/lib/store';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, canGoBack: () => false, back: jest.fn() }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ user: { uid: 'customer-a' } }) }));
jest.mock('@/lib/firestoreOps', () => ({ useBranches: jest.fn(), useFirestoreBookings: jest.fn(), cancelBooking: jest.fn() }));
jest.mock('@/lib/session', () => ({ signOutCompletely: jest.fn() }));
jest.mock('@/components/RemoteImage', () => ({ RemoteImage: () => null }));

const garage = (id: number) => ({ id: `garage-${id}`, name: `Garage ${id}`, type: 'AC specialist',
  area: id % 2 ? 'Doha' : 'Lusail', category: 'ac', tags: [], rating: 4, reviews: 10,
  responseTime: '20 min', startingPrice: 'QAR 100', verified: false, openNow: true });
const refresh = jest.fn(async () => {});
beforeEach(() => {
  jest.clearAllMocks();
  useQarWheelStore.getState().clearPersonalData();
  jest.mocked(useBranches).mockReturnValue({ vendors: [], jobs: [], loading: false, error: false, refresh });
  jest.mocked(useFirestoreBookings).mockReturnValue({ bookings: [], loading: false, error: false, refresh });
});

it('does not mount thousands of garage rows at once', () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: Array.from({ length: 5000 }, (_, i) => garage(i)) as never, jobs: [], loading: false, error: false, refresh });
  render(<SearchScreen />);
  expect(screen.getAllByText(/^Garage \d+$/).length).toBeLessThan(100);
  expect(screen.getByText('5000 garages')).toBeTruthy();
});

it('searches multiple terms and uses only genuine submitted recent searches', async () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: [garage(1), garage(2)] as never, jobs: [], loading: false, error: false, refresh });
  render(<SearchScreen />);
  expect(screen.queryByText('Recent searches')).toBeNull();
  fireEvent.changeText(screen.getByLabelText('Search garages'), 'Doha AC');
  await waitFor(() => expect(screen.getByText('1 garages')).toBeTruthy());
  expect(screen.queryByText('Garage 2')).toBeNull();
  fireEvent(screen.getByLabelText('Search garages'), 'submitEditing');
  fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
  await waitFor(() => expect(screen.getByText('Recent searches')).toBeTruthy());
  fireEvent.press(screen.getByRole('button', { name: 'Remove search Doha AC' }));
  expect(screen.queryByText('Recent searches')).toBeNull();
});

it('shows a retry action instead of disguising a load failure as no results', () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: [], jobs: [], loading: false, error: true, refresh });
  render(<SearchScreen />);
  expect(screen.queryByText('No garages listed yet')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: /retry/i }));
  expect(refresh).toHaveBeenCalled();
});

it('puts declined and missed appointments in history, not active bookings', () => {
  const base = { garage: 'Real garage', garageId: 'garage-a', vehicle: 'My car', date: '2026-10-31', bookingDate: '2026-10-31' };
  jest.mocked(useFirestoreBookings).mockReturnValue({ bookings: [
    { ...base, id: 'a', status: 'Declined', service: 'Declined service' },
    { ...base, id: 'b', status: 'NoShow', service: 'Missed service' },
    { ...base, id: 'c', status: 'Pending', service: 'Pending service' },
  ] as never, loading: false, error: false, refresh });
  render(<BookingsScreen />);
  expect(screen.queryByText('Declined service')).toBeNull();
  expect(screen.getByText('Pending service')).toBeTruthy();
  fireEvent.press(screen.getByRole('tab', { name: 'History, 2 bookings' }));
  expect(screen.getByText('Declined service')).toBeTruthy();
  expect(screen.getByText('Missed service')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cancel Declined service' })).toBeDisabled();
});

it('starts new bookings with garage selection and messages the actual garage', () => {
  jest.mocked(useFirestoreBookings).mockReturnValue({ bookings: [{ id: 'booking-a', status: 'Pending', garage: 'Real garage', garageId: 'garage-a', service: 'Oil change', vehicle: 'My car', date: '2026-10-31' }] as never, loading: false, error: false, refresh });
  render(<BookingsScreen />);
  fireEvent.press(screen.getByRole('button', { name: 'Message Real garage' }), { stopPropagation: jest.fn() });
  expect(mockPush).toHaveBeenCalledWith('/chat/garage-a');
  fireEvent.press(screen.getByRole('button', { name: /New booking/ }));
  expect(mockPush).toHaveBeenLastCalledWith('/search');
});
