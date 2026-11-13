import { fireEvent, render, screen } from '@testing-library/react-native';
import { GarageDetailScreen } from '@/components/DetailScreens';
import { useBranchServices } from '@/lib/firestoreOps';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'garage-1' }),
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock('@/components/RemoteImage', () => ({ RemoteImage: () => null }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));
jest.mock('@/lib/firestoreOps', () => ({
  useGarage: () => ({ garage: {
    id: 'garage-1', name: 'Apex Workshop', imageUrl: '', type: 'Brake specialist',
    category: 'Repairs', area: 'Al Quoz', distanceKm: 3.2, rating: 4.9,
    reviews: 42, verified: true, openNow: true, responseTime: '20 min',
    startingPrice: 'QAR 140', startingPriceValue: 140, availability: 'Now',
    warranty: '6 months', pickupAvailable: false, tags: [],
  }, loading: false }),
  useBranchServices: jest.fn(() => ({ services: [
    { id: 'brakes-1', title: 'Brake inspection', price: 'QAR 140', duration: '45 min', availability: 'On request' },
  ], loading: false })),
}));

beforeEach(() => {
  mockPush.mockClear();
  jest.mocked(useBranchServices).mockReturnValue({ services: [{ id: 'brakes-1', title: 'Brake inspection', price: 'QAR 140', duration: '45 min', availability: 'On request' }] as never, loading: false });
});

it('shows real garage details and keeps booking and contact actions wired', async () => {
  await render(<GarageDetailScreen />);

  expect(screen.getByText('Verified partner')).toBeTruthy();
  expect(screen.getAllByText('Apex Workshop').length).toBeGreaterThan(0);
  expect(screen.getByText('Preferred time and final price confirmed by the garage.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Choose service and preferred time at Apex Workshop' }));
  expect(mockPush).toHaveBeenLastCalledWith('/checkout/garage-1');
  await fireEvent.press(screen.getByRole('button', { name: 'Message Apex Workshop' }));
  expect(mockPush).toHaveBeenLastCalledWith('/chat/garage-1');
  await fireEvent.press(screen.getByRole('button', { name: 'Show Apex Workshop on map' }));
  expect(mockPush).toHaveBeenLastCalledWith('/map?garageId=garage-1');
  await fireEvent.press(screen.getByRole('button', { name: 'Book Brake inspection' }));
  expect(mockPush).toHaveBeenLastCalledWith('/checkout/brakes-1');
  expect(screen.queryByRole('button', { name: 'Request a quote from Apex Workshop' })).toBeNull();
});

it('does not offer checkout when a garage has no bookable services', async () => {
  jest.mocked(useBranchServices).mockReturnValue({ services: [], loading: false });
  await render(<GarageDetailScreen />);
  expect(screen.getByText('No services listed yet. Message the garage to ask about your repair.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Choose service and preferred time at Apex Workshop' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Message Apex Workshop' }));
  expect(mockPush).toHaveBeenCalledWith('/chat/garage-1');
});
