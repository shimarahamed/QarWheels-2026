import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Dimensions, Platform, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlassTabBar, useGlassTabBottom } from '@/components/GlassTabBar';
import { useQarWheelStore } from '@/lib/store';

jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
jest.mock('expo-glass-effect', () => ({
  GlassView: (props: object) => require('react').createElement(require('react-native').View, { ...props, testID: 'native-glass' }),
  isLiquidGlassAvailable: jest.fn(() => false),
  isGlassEffectAPIAvailable: jest.fn(() => false),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const originalDimensions = { window: Dimensions.get('window'), screen: Dimensions.get('screen') };

function TabBottom() {
  return <Text testID="tab-bottom">{useGlassTabBottom()}</Text>;
}

beforeEach(() => {
  Dimensions.set({
    window: { ...originalDimensions.window, fontScale: 1 },
    screen: { ...originalDimensions.screen, fontScale: 1 },
  });
});

afterEach(async () => {
  await act(async () => { Dimensions.set(originalDimensions); });
  jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);
  jest.mocked(isGlassEffectAPIAvailable).mockReturnValue(false);
  jest.restoreAllMocks();
});

it('keeps all destinations labeled and exposes the selected tab', async () => {
  useQarWheelStore.setState({ themeMode: 'light' });
  const onBookings = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <GlassTabBar items={[
        { key: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home', selected: true, onPress: jest.fn() },
        { key: 'bookings', label: 'Bookings', icon: 'calendar-outline', iconActive: 'calendar', selected: false, onPress: onBookings },
        { key: 'quick', label: 'Quick', icon: 'add-circle-outline', iconActive: 'add-circle', selected: false, onPress: jest.fn() },
      ]} />
    </SafeAreaProvider>,
  );

  expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
  expect(screen.queryByTestId('glass-tab-scroll')).toBeNull();
  expect(screen.getByRole('tab', { name: 'Quick' })).toBeTruthy();
  const selection = StyleSheet.flatten(screen.getByTestId('glass-tab-selection-home').props.style);
  expect(selection.borderRadius).toBe(28);
  expect(selection.borderWidth).toBeUndefined();
  await fireEvent.press(screen.getByRole('tab', { name: 'Bookings' }));
  expect(onBookings).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('native-glass')).toBeNull();
});

it('keeps scaled labels whole in a scrollable bar and clears the taller bar', async () => {
  Dimensions.set({
    window: { ...originalDimensions.window, width: 320, fontScale: 2.5 },
    screen: { ...originalDimensions.screen, width: 320, fontScale: 2.5 },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <GlassTabBar items={[
        { key: 'requests', label: 'Requests', icon: 'file-tray-outline', iconActive: 'file-tray', selected: true, onPress: jest.fn() },
        { key: 'bookings', label: 'Bookings', icon: 'calendar-outline', iconActive: 'calendar', selected: false, onPress: jest.fn() },
        { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline', iconActive: 'bar-chart', selected: false, onPress: jest.fn() },
      ]} />
      <TabBottom />
    </SafeAreaProvider>,
  );

  const scroll = screen.getByTestId('glass-tab-scroll');
  expect(scroll.props.horizontal).toBe(true);
  expect(StyleSheet.flatten(screen.getByRole('tab', { name: 'Requests' }).props.style).minWidth).toBe(170);
  expect(StyleSheet.flatten(scroll.parent?.props.style).height).toBe(72);
  expect(screen.getByText('Requests').props.allowFontScaling).not.toBe(false);
  expect(screen.getByText('Requests').props.numberOfLines).toBe(1);
  expect(screen.getByTestId('tab-bottom').props.children).toBe(112);
});

it('uses the native material only when both iOS availability checks pass', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);
  jest.mocked(isGlassEffectAPIAvailable).mockReturnValue(true);
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <GlassTabBar items={[
        { key: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home', selected: true, onPress: jest.fn() },
      ]} />
    </SafeAreaProvider>,
  );
  expect(screen.getByTestId('native-glass')).toBeTruthy();
});
