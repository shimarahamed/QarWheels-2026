import { fireEvent, render, screen } from '@testing-library/react-native';
import { canAccess } from '@/lib/permissions';
import { VendorTabBar } from '@/components/VendorTabBar';

const mockRouter = { push: jest.fn() };
let mockPathname = '/vendor/dashboard';

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ role: 'business_owner' }) }));
jest.mock('@/lib/permissions', () => ({ canAccess: jest.fn(() => true) }));
jest.mock('@/components/GlassTabBar', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    GLASS_TAB_HEIGHT: 68,
    useGlassTabBottom: () => 90,
    GlassTabBar: ({ items }: { items: { key: string; label: string; selected: boolean; onPress: () => void }[] }) => (
      <View>{items.map((item) => (
        <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label}
          accessibilityState={{ selected: item.selected }} onPress={item.onPress}>
          <Text>{item.label}</Text>
        </Pressable>
      ))}</View>
    ),
  };
});

beforeEach(() => {
  mockRouter.push.mockClear();
  mockPathname = '/vendor/dashboard';
  jest.mocked(canAccess).mockReturnValue(true);
});

it('keeps vendor destinations and their current state', async () => {
  await render(<VendorTabBar />);
  expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
  await fireEvent.press(screen.getByRole('tab', { name: 'Services' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/vendor/services');
});

it('does not show a role-restricted tab', async () => {
  jest.mocked(canAccess).mockImplementation((_role, section) => section !== 'services');
  await render(<VendorTabBar />);
  expect(screen.queryByRole('tab', { name: 'Services' })).toBeNull();
  expect(screen.getByRole('tab', { name: 'Home' })).toBeTruthy();
});
