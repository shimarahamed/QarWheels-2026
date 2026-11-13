import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import CustomerHome from '@/components/CustomerHome';
import { useAuthContext } from '@/lib/AuthContext';
import { useBranches } from '@/lib/firestoreOps';
import { useQarWheelStore } from '@/lib/store';
import type { Garage } from '@/lib/marketplace';

const mockPush = jest.fn();
const refresh = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: jest.fn() }));
jest.mock('@/lib/firestoreOps', () => ({ useBranches: jest.fn() }));
jest.mock('@/lib/i18n', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }));
jest.mock('@/components/GlassTabBar', () => ({ useGlassTabBottom: () => 90 }));
jest.mock('@/components/RemoteImage', () => ({ RemoteImage: () => null }));

const garage = {
  id: 'branch-1', name: 'Doha Motor Works', area: 'Industrial Area', city: 'Doha',
  rating: 0, reviews: 0, startingPrice: 'Price on request', imageUrl: '', tags: [],
  type: 'Car Service & Repair', category: 'Auto repair shop', distanceKm: 0, openNow: null,
  responseTime: 'Response time unavailable', startingPriceValue: 0, availability: 'On request',
  verified: true, pickupAvailable: false, warranty: '',
} satisfies Garage;

beforeEach(() => {
  jest.clearAllMocks();
  useQarWheelStore.getState().clearPersonalData();
  jest.mocked(useAuthContext).mockReturnValue({ user: { displayName: 'Aisha Saleh' } } as never);
  jest.mocked(useBranches).mockReturnValue({ vendors: [garage], loading: false, error: false, refresh } as never);
});
afterEach(cleanup);

it('preserves the original Home sections while using real listings and honest copy', async () => {
  await render(<CustomerHome />);
  expect(screen.getByText(/Good (morning|afternoon|evening), Aisha/)).toBeTruthy();
  for (const heading of ['Featured Services', 'All Categories', 'Garages Near You', 'Offers', 'German Car Specialist', 'Trust & Safety']) {
    expect(screen.getByText(heading)).toBeTruthy();
  }
  expect(screen.getByText('Book Any Service')).toBeTruthy();
  expect(screen.getByText('Find an AC specialist')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Book Service' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'My Cars' })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Roadside' })).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: 'Request Quote' })).toHaveLength(2);
  expect(screen.getByText('Doha Motor Works')).toBeTruthy();
  expect(screen.getByText('Price on request')).toBeTruthy();
  expect(screen.getByText('No live offers right now')).toBeTruthy();
  expect(screen.queryByText(/Verified garages|Best prices|Secure Payments|24\/7 Support|AED 159/i)).toBeNull();
  expect(screen.queryByText(/0\.0 \(0 reviews\)/)).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Search garages, services, parts' }));
  await fireEvent.press(screen.getByRole('button', { name: 'My Cars' }));
  await fireEvent.press(screen.getAllByRole('button', { name: 'Roadside' })[0]);
  await fireEvent.press(screen.getByRole('button', { name: 'AC & Heating' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Find Oil Change' }));
  await fireEvent.press(screen.getByRole('button', { name: 'View Doha Motor Works' }));
  expect(mockPush.mock.calls.map(([path]) => path)).toEqual(['/search', '/(tabs)/cars', '/roadside', '/search?term=AC', '/search?term=Oil%20change', '/garage/branch-1']);
});

it('distinguishes loading, failure, and confirmed empty workshops', async () => {
  jest.mocked(useBranches).mockReturnValue({ vendors: [], loading: true, error: false, refresh } as never);
  const view = await render(<CustomerHome />);
  expect(screen.getByLabelText('Loading workshops')).toBeTruthy();
  expect(screen.queryByText('No workshops listed yet')).toBeNull();

  jest.mocked(useBranches).mockReturnValue({ vendors: [], loading: false, error: true, refresh } as never);
  await view.rerender(<CustomerHome />);
  expect(screen.queryByText('No workshops listed yet')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /retry/i }));
  expect(refresh).toHaveBeenCalledTimes(1);

  jest.mocked(useBranches).mockReturnValue({ vendors: [], loading: false, error: false, refresh } as never);
  await view.rerender(<CustomerHome />);
  expect(screen.getByText('No workshops listed yet')).toBeTruthy();
});
