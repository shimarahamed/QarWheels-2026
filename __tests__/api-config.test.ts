import { Platform } from 'react-native';
import { apiBaseUrl } from '@/lib/api';

const original = process.env.EXPO_PUBLIC_API_BASE_URL;
const originalPlatform = Platform.OS;

afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = original;
  Platform.OS = originalPlatform;
});

it('rejects a missing native API endpoint before sending a request', () => {
  Platform.OS = 'android';
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  expect(apiBaseUrl).toThrow('Backend API is not configured');
});

it('rejects a loopback endpoint on native devices', () => {
  Platform.OS = 'ios';
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:9002';
  expect(apiBaseUrl).toThrow('device-reachable');
});

it('accepts an HTTPS endpoint and removes a trailing slash', () => {
  Platform.OS = 'android';
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://staging.example.test/api/';
  expect(apiBaseUrl()).toBe('https://staging.example.test/api');
});

it('keeps local web development available without a configured endpoint', () => {
  Platform.OS = 'web';
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  expect(apiBaseUrl()).toBe('http://localhost:9002');
});
