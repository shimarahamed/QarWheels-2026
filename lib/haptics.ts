import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function tap() {
  if (Platform.OS === 'web') return;
  await Haptics.selectionAsync().catch(() => undefined);
}

export async function success() {
  if (Platform.OS === 'web') return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export async function warning() {
  if (Platform.OS === 'web') return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}
