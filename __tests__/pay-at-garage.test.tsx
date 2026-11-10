import { cleanup, render, screen, waitFor } from '@testing-library/react-native';
import { Animated } from 'react-native';
import ReadyPickupScreen from '@/app/ready-pickup/[id]';
import PayoutsScreen from '@/app/vendor/payouts';
import { useQarWheelStore } from '@/lib/store';
import { fetchPayouts } from '@/lib/billing';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'booking_1' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/lib/motion', () => ({
  MotionScreen: ({ children }: { children: React.ReactNode }) => children,
  MotionSurface: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ businessId: 'business_1' }) }));
jest.mock('@/components/VendorTabBar', () => ({ useVendorTabBottom: () => 70 }));
jest.mock('@/lib/billing', () => ({
  fetchPayouts: jest.fn(),
  formatMinorUnits: (value: number) => `QAR ${value / 100}`,
  formatBillingDate: (value: string) => value,
  PAYOUT_STATUS_COLORS: { Pending: { bg: '#eee', text: '#111' }, Processing: { bg: '#eee', text: '#111' } },
}));

beforeEach(() => {
  jest.spyOn(Animated, 'loop').mockReturnValue({ start: jest.fn(), stop: jest.fn() } as never);
  useQarWheelStore.setState({
    bookings: [{
      id: 'booking_1', garage: 'Doha Garage', service: 'Inspection',
      paymentMethod: 'Card', totalAmount: 100,
    }] as never,
  });
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

it('does not claim an old card-labelled booking was paid', async () => {
  await render(<ReadyPickupScreen />);
  expect(screen.getByText(/QarWheel has not processed a payment/)).toBeTruthy();
  expect(screen.getByText('Garage quote')).toBeTruthy();
  expect(screen.queryByText(/Payment already processed/)).toBeNull();
});

it('shows no payout balance or request action in a pay-at-garage release', async () => {
  jest.mocked(fetchPayouts).mockResolvedValue({
    paymentsLive: false,
    payouts: [],
    transactions: [],
    available: { transactionCount: 0, grossMinorUnits: 0, commissionMinorUnits: 0, netMinorUnits: 0, currency: 'QAR' },
  });
  await render(<PayoutsScreen />);
  await waitFor(() => expect(screen.getByText(/QarWheel does not collect those funds/)).toBeTruthy());
  expect(screen.queryByText('Available')).toBeNull();
  expect(screen.queryByText(/Request Payout/)).toBeNull();
  expect(screen.getByText('Previous payout records')).toBeTruthy();
});
