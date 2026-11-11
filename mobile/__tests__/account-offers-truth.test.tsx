import { cleanup, render, screen } from '@testing-library/react-native';
import AccountServices from '@/components/AccountServices';

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ user: null }) }));
jest.mock('@/lib/firestoreOps', () => ({
  useBranches: () => ({ vendors: [] }),
  useCars: () => ({ cars: [], isLoading: false }),
}));
jest.mock('@/components/AnimatedPressable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/lib/motion', () => ({
  MotionScreen: ({ children }: { children: React.ReactNode }) => children,
  MotionSurface: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ language: 'en', changeLanguage: jest.fn(), t: (key: string) => key }),
}));

afterEach(cleanup);

it('does not sell sample subscriptions', async () => {
  await render(<AccountServices initialSection="subscriptions" />);
  expect(screen.getByText('Subscriptions unavailable')).toBeTruthy();
  expect(screen.queryByText(/QAR 49/)).toBeNull();
});

it('does not advertise sample coupon codes', async () => {
  await render(<AccountServices initialSection="coupons" />);
  expect(screen.getByText('Coupons unavailable')).toBeTruthy();
  expect(screen.queryByText(/QARCARE20/)).toBeNull();
});
