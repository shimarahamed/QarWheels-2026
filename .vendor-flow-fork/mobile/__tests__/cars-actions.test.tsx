import { fireEvent, render, screen } from '@testing-library/react-native';
import { CarsScreen } from '@/components/Marketplace';
import { useCars } from '@/lib/firestoreOps';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ user: { uid: 'customer-a' } }) }));
jest.mock('@/lib/firestoreOps', () => ({ useCars: jest.fn() }));
jest.mock('@/lib/session', () => ({ signOutCompletely: jest.fn() }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

beforeEach(() => {
  mockPush.mockClear();
  jest.mocked(useCars).mockReturnValue({
    cars: [{ id: 'car-a', year: 2024, make: 'Toyota', model: 'Camry', licensePlate: 'QA 123', currentMileage: 12000 }],
    isLoading: false, error: false, refresh: jest.fn(),
  } as never);
});

it('keeps dashboard, booking, passport, documents and health as separate actions', async () => {
  await render(<CarsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Request service for 2024 Toyota Camry' }));
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenLastCalledWith('/checkout/car-a');
  await fireEvent.press(screen.getByRole('button', { name: 'View passport for 2024 Toyota Camry' }));
  expect(mockPush).toHaveBeenLastCalledWith('/vehicle-passport/car-a');
  await fireEvent.press(screen.getByRole('button', { name: 'View docs for 2024 Toyota Camry' }));
  expect(mockPush).toHaveBeenLastCalledWith('/vehicle-documents/car-a');
  await fireEvent.press(screen.getByRole('button', { name: 'View health for 2024 Toyota Camry' }));
  expect(mockPush).toHaveBeenLastCalledWith('/vehicle-health-score/car-a');
  await fireEvent.press(screen.getByRole('button', { name: 'Open 2024 Toyota Camry dashboard' }));
  expect(mockPush).toHaveBeenLastCalledWith('/vehicle-dashboard/car-a');
});
