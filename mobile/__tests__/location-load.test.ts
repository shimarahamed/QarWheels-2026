jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(), getLastKnownPositionAsync: jest.fn(), getCurrentPositionAsync: jest.fn(),
  PermissionStatus: { GRANTED: 'granted' }, Accuracy: { Balanced: 3 },
}));

let location: typeof import('expo-location');
let getDeviceLocation: typeof import('@/lib/geo').getDeviceLocation;
beforeEach(() => {
  jest.resetModules(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-31T10:00:00Z'));
  location = require('expo-location');
  getDeviceLocation = require('@/lib/geo').getDeviceLocation;
  jest.mocked(location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
  jest.mocked(location.getLastKnownPositionAsync).mockResolvedValue({ coords: { latitude: 25.28, longitude: 51.53 } } as never);
});
afterEach(() => jest.useRealTimers());

it('coalesces 20 simultaneous screen requests into one location lookup', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () => getDeviceLocation()));
  expect(location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(location.getLastKnownPositionAsync).toHaveBeenCalledTimes(1);
  expect(results.every((value) => value?.latitude === 25.28)).toBe(true);
  await getDeviceLocation();
  expect(location.getLastKnownPositionAsync).toHaveBeenCalledTimes(1);
});

it('does not repeatedly probe denied permissions', async () => {
  jest.mocked(location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'denied' } as never);
  expect(await getDeviceLocation()).toBeNull();
  expect(await getDeviceLocation()).toBeNull();
  expect(location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

it('finishes a hung GPS request after twelve seconds', async () => {
  jest.mocked(location.getLastKnownPositionAsync).mockImplementation(() => new Promise(() => {}));
  const request = getDeviceLocation();
  await jest.advanceTimersByTimeAsync(12_000);
  expect(await request).toBeNull();
});

it('rejects invalid coordinates', async () => {
  jest.mocked(location.getLastKnownPositionAsync).mockResolvedValue({ coords: { latitude: NaN, longitude: 999 } } as never);
  expect(await getDeviceLocation()).toBeNull();
});
