import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Foreground handler — show banners while app is open ──────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Register for push notifications ─────────────────────────────────────────

let _pushToken: string | null = null;

export async function registerForPushNotificationsAsync(): Promise<string | null> {

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
    const token = (await Notifications.getExpoPushTokenAsync()).data;
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
