import type { BleManager } from 'react-native-ble-plx';

export async function createBleManager(): Promise<BleManager> {
  throw new Error('Bluetooth diagnostics require an iOS or Android development build.');
}
