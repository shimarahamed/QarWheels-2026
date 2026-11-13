import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Native from 'react-native';
import { VendorWorkspaceShell } from '@/components/vendor/VendorWorkspaceShell';
import { VendorTabBar } from '@/components/VendorTabBar';

const mockPush = jest.fn();
let mockRole = 'business_owner';
let mockPathname = '/vendor/dashboard';
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => mockPathname }));
jest.mock('@/lib/AuthContext', () => ({ useAuthContext: () => ({ role: mockRole }) }));
jest.mock('@/components/vendor/BranchSwitcher', () => ({ BranchSwitcher: () => null }));
jest.mock('@/components/GlassTabBar', () => {
  const { Text, View } = require('react-native');
  return { GLASS_TAB_HEIGHT: 68, useGlassTabBottom: () => 90,
    GlassTabBar: ({ items }: { items: { label: string }[] }) => <View testID="vendor-phone-tabs">{items.map((item) => <Text key={item.label}>{item.label}</Text>)}</View> };
});

beforeEach(() => { mockPush.mockClear(); mockRole = 'business_owner'; mockPathname = '/vendor/dashboard'; });
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

function viewport(width: number) {
  const size = { width, height: 900, scale: 1, fontScale: 1 };
  Native.Dimensions.set({ window: size, screen: size });
}

it('keeps phone content accessible with bottom navigation and no sidebar', async () => {
  viewport(320);
  await render(<VendorWorkspaceShell><Text>Workspace content</Text><VendorTabBar /></VendorWorkspaceShell>);
  expect(screen.getByText('Workspace content')).toBeTruthy();
  expect(screen.getByTestId('vendor-phone-tabs')).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Inventory' })).toBeNull();
});

it('uses an accessible compact rail on tablets and keeps existing routes', async () => {
  viewport(820);
  await render(<VendorWorkspaceShell><Text>Workspace content</Text><VendorTabBar /></VendorWorkspaceShell>);
  expect(screen.queryByTestId('vendor-phone-tabs')).toBeNull();
  expect(screen.queryByText('QarWheel')).toBeNull();
  await fireEvent.press(screen.getByRole('link', { name: 'Services' }));
  expect(mockPush).toHaveBeenCalledWith('/vendor/services');
});

it('expands desktop labels and preserves selected and role-restricted navigation', async () => {
  viewport(1440);
  mockPathname = '/vendor/inventory';
  const { rerender } = await render(<VendorWorkspaceShell><Text>Workspace content</Text></VendorWorkspaceShell>);
  expect(screen.getByText('QarWheel')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Inventory' })).toBeSelected();
  mockRole = 'vendor_staff';
  await rerender(<VendorWorkspaceShell><Text>Workspace content</Text></VendorWorkspaceShell>);
  expect(screen.queryByRole('link', { name: 'Inventory' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Bookings' })).toBeTruthy();
});
