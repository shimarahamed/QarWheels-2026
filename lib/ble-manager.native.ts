import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';

export async function createBleManager(): Promise<BleManager> {
  if (Platform.OS === 'android') {
    const permissions = Number(Platform.Version) >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const results = await PermissionsAndroid.requestMultiple(permissions);
    if (permissions.some((permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED)) {
      throw new Error('Bluetooth permission is required to scan your vehicle.');
    }
  }
  const manager = new BleManager();
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { subscription.remove(); reject(new Error('Turn on Bluetooth and try again.')); }, 5000);
      const subscription = manager.onStateChange((state) => {
        if (state === State.Unknown || state === State.Resetting) return;
        clearTimeout(timeout);
        subscription.remove();
        if (state === State.PoweredOn) resolve();
        else reject(new Error('Bluetooth is unavailable. Check permissions and turn it on.'));
      }, false);
      void manager.state().then((state) => {
        if (state === State.PoweredOn) { clearTimeout(timeout); subscription.remove(); resolve(); }
      }).catch((error) => { clearTimeout(timeout); subscription.remove(); reject(error); });
    });
    return manager;
  } catch (error) {
    await manager.destroy();
    throw error;
  }
}
