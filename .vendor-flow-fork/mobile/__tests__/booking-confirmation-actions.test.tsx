import { fireEvent, render, screen } from '@testing-library/react-native';
import BookingConfirmationScreen from '@/app/booking-confirmation/[id]';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'booking-1' }),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock('@/lib/firestoreOps', () => ({ useGarage: () => ({ garage: null }) }));
jest.mock('@/lib/motion', () => ({ MotionScreen: ({ children }: { children: React.ReactNode }) => children }));

it('opens booking follow-up without offering the missing calendar API', async () => {
  const fetch = jest.spyOn(global, 'fetch');
  try {
    await render(<BookingConfirmationScreen />);
    expect(screen.queryByText('Add to calendar')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'View booking' }));
    expect(mockPush).toHaveBeenCalledWith('/booking/booking-1');
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    fetch.mockRestore();
  }
});
