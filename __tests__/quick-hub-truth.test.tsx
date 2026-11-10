import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickScreen from '@/app/(tabs)/quick';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => mockPush.mockClear());

it('offers working service and vehicle routes without claiming AI or dispatch is live', async () => {
  await render(<QuickScreen />);
  expect(screen.queryByText(/we dispatch help|Powered by AI|Ask AI Mechanic/i)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Find a service' }));
  expect(mockPush).toHaveBeenCalledWith('/services');
  await fireEvent.press(screen.getByText('Workshops'));
  expect(mockPush).toHaveBeenCalledWith('/search');
});
