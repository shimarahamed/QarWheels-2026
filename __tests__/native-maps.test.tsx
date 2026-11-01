import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import GarageMap from '@/components/GarageMap.native';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'native-map' }),
    Marker: (props: Record<string, unknown>) => React.createElement(Pressable, { ...props, testID: 'garage-marker' }),
    PROVIDER_GOOGLE: 'google',
  };
});

const originalKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const garage = { id: 'garage-a', name: 'Actual garage', area: 'Doha', latitude: 25.28, longitude: 51.53 };
afterEach(() => {
  jest.restoreAllMocks();
  if (originalKey === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  else process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = originalKey;
});

it('falls back to a selectable garage list on Android without a maps key', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const select = jest.fn();
  render(<GarageMap garages={[garage] as never} userLocation={null} onSelect={select} />);
  expect(screen.queryByTestId('native-map')).toBeNull();
  fireEvent.press(screen.getByText('Actual garage - Doha'));
  expect(select).toHaveBeenCalledWith(garage);
});

it('renders native markers and selection on configured Android', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
  const select = jest.fn();
  render(<GarageMap garages={[garage] as never} userLocation={null} onSelect={select} />);
  expect(screen.getByTestId('native-map')).toBeTruthy();
  fireEvent.press(screen.getByTestId('garage-marker'));
  expect(select).toHaveBeenCalledWith(garage);
});

it('uses the native iOS map without requiring a Google key', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  render(<GarageMap garages={[]} userLocation={null} onSelect={jest.fn()} />);
  expect(screen.getByTestId('native-map')).toBeTruthy();
});
