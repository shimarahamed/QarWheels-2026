import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firestore } from './firebase';

// ── Foreground handler — show banners while app is open ──────────────────────
// `shouldShowAlert` is deprecated in SDK 54; banner + list replace it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Register for push notifications ─────────────────────────────────────────

let _pushToken: string | null = null;

/**
 * Resolve the EAS project id. `getExpoPushTokenAsync` defaults to
 * `expoConfig.extra.eas.projectId`, but that lookup silently fails in some
 * build/runtime combinations, so we pass it explicitly.
 */
function easProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Simulators/emulators cannot receive remote push. Asking anyway burns the
  // one-shot iOS permission prompt for nothing.
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('booking-updates', {
      name: 'Booking updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E31E24',
    });
  }

  try {
    const projectId = easProjectId();
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data;
    _pushToken = token;
    return token;
  } catch {
    // Device may not have Google Play / APNs configured in dev
    return null;
  }
}

export function getPushToken(): string | null {
  return _pushToken;
}

// ── Persisting the token ─────────────────────────────────────────────────────
// Without this the token never leaves the device and no server can ever push
// to it. Tokens rotate, so we keep a set per user rather than a single field.

/** Track the last (user, token) pair we wrote so remounts don't re-write. */
let _syncedFor: string | null = null;

/**
 * Attach this device's push token to the signed-in user's profile.
 * Safe to call repeatedly; no-ops when nothing has changed.
 */
export async function syncPushTokenToProfile(userId: string): Promise<void> {
  const token = _pushToken ?? (await registerForPushNotificationsAsync());
  if (!token) return;

  const key = `${userId}:${token}`;
  if (_syncedFor === key) return;

  try {
    await setDoc(
      doc(firestore, 'users', userId),
      {
        pushTokens: arrayUnion(token),
        pushPlatform: Platform.OS,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    _syncedFor = key;
  } catch {
    // Offline or rules rejection — retried on next sign-in.
  }
}

/**
 * Detach this device's token on sign-out, so the next person to use the
 * device does not receive the previous user's booking notifications.
 */
export async function clearPushTokenFromProfile(userId: string): Promise<void> {
  _syncedFor = null;
  if (!_pushToken) return;

  try {
    const { arrayRemove } = await import('firebase/firestore');
    await setDoc(
      doc(firestore, 'users', userId),
      { pushTokens: arrayRemove(_pushToken), updatedAt: new Date().toISOString() },
      { merge: true },
    );
  } catch {
    // Best effort.
  }
}

// ── Local notification helpers ───────────────────────────────────────────────

export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: null, // fire immediately
  });
}

export async function notifyBookingStatusChange(
  status: string,
  garageName?: string,
): Promise<void> {
  const labels: Record<string, string> = {
    Confirmed:   'Booking confirmed',
    'In Progress': 'Service started',
    Completed:   'Service complete',
    Cancelled:   'Booking cancelled',
    Pending:     'Awaiting confirmation',
  };
  const title = labels[status] ?? 'Booking updated';
  const body = garageName
    ? `${garageName} — your booking is now ${status.toLowerCase()}.`
    : `Your booking is now ${status.toLowerCase()}.`;

  await scheduleLocalNotification(title, body).catch(() => {
    // Silently ignore if notifications aren't granted (first-run, web preview, etc.)
  });
}
