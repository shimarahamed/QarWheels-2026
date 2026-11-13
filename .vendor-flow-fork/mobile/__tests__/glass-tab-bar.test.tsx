import { fireEvent, render, screen } from '@testing-library/react-native';
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlassTabBar } from '@/components/GlassTabBar';
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

afterEach(() => {
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
  expect(screen.getByRole('tab', { name: 'Quick' })).toBeTruthy();
  const selection = StyleSheet.flatten(screen.getByTestId('glass-tab-selection-home').props.style);
  expect(selection.borderRadius).toBe(28);
  expect(selection.borderWidth).toBeUndefined();
  await fireEvent.press(screen.getByRole('tab', { name: 'Bookings' }));
  expect(onBookings).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('native-glass')).toBeNull();
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
