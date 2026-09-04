import { getAdminFirestore } from '@/lib/firebase-admin';
import { trackApiError } from '@/lib/observability';

// Server-side push delivery via Expo's Push API — the send half of the
// pipeline mobile/lib/notifications.ts already builds the receive half of
// (permission request, token registration, token persisted to
// users/{uid}.pushTokens). Nothing called Expo's API before this; the
// booking transition route's hook point was marked but empty.
//
// Uses the plain HTTP endpoint directly (no expo-server-sdk dependency) —
// it's one POST with a JSON body and no auth token required for the free
// tier, so adding a whole SDK for it isn't worth the extra dependency.
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Expo's endpoint accepts up to 100 messages per request.
const EXPO_PUSH_BATCH_SIZE = 100;

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  channelId?: string;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

/**
 * Sends push notifications to a set of Expo push tokens. Never throws —
 * push delivery is a best-effort side effect of a booking transition, not
 * something that should fail the transition itself if e.g. Expo's service
 * is down or a token has gone stale.
 *
 * A stale/invalid token (Expo returns `DeviceNotRegistered`) is removed
 * from the owning user's pushTokens array so it stops being retried on
 * every future notification — the one piece of cleanup this function does
 * beyond just sending.
 */
export async function sendPushNotifications(
  recipients: { userId: string; tokens: string[] }[],
  notification: { title: string; body: string; data?: Record<string, unknown>; channelId?: string },
): Promise<void> {
  const tokenToUser = new Map<string, string>();
  const messages: ExpoPushMessage[] = [];

  for (const recipient of recipients) {
    for (const token of recipient.tokens) {
      // Expo push tokens look like "ExponentPushToken[xxxxxxxx]" — a stray
      // non-token value in the array (shouldn't happen, but the field is
      // client-writable) is silently skipped rather than sent to Expo and
      // rejected as malformed.
      if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) continue;
      tokenToUser.set(token, recipient.userId);
      messages.push({
        to: token,
        title: notification.title,
        body: notification.body,
        sound: 'default',
        ...(notification.data ? { data: notification.data } : {}),
        ...(notification.channelId ? { channelId: notification.channelId } : {}),
      });
    }
  }

  if (messages.length === 0) return;

  const staleTokensByUser = new Map<string, string[]>();

  try {
    for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
      const batch = messages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          // Optional but recommended by Expo for production: raises the
          // rate limit and lets Expo attribute requests to this project.
          // Works fine without it at lower volume — not a hard requirement.
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        trackApiError('push:send', new Error(`Expo push endpoint returned ${response.status}`));
        continue;
      }

      const body = (await response.json()) as { data?: ExpoPushTicket[] };
      const tickets = body.data ?? [];

      tickets.forEach((ticket, idx) => {
        if (ticket.status !== 'error') return;
        const token = batch[idx]?.to;
        if (!token) return;
        if (ticket.details?.error === 'DeviceNotRegistered') {
          const userId = tokenToUser.get(token);
          if (!userId) return;
          const existing = staleTokensByUser.get(userId) ?? [];
          existing.push(token);
          staleTokensByUser.set(userId, existing);
        } else {
          trackApiError('push:send', new Error(`Expo push ticket error: ${ticket.message ?? ticket.details?.error ?? 'unknown'}`));
        }
      });
    }
  } catch (error) {
    trackApiError('push:send', error);
  }

  if (staleTokensByUser.size > 0) {
    try {
      const db = getAdminFirestore();
      const batch = db.batch();
      for (const [userId, staleTokens] of staleTokensByUser) {
        const ref = db.collection('users').doc(userId);
        // FieldValue.arrayRemove needs the exact values, which we have.
        const { FieldValue } = await import('firebase-admin/firestore');
        batch.update(ref, { pushTokens: FieldValue.arrayRemove(...staleTokens) });
      }
      await batch.commit();
    } catch (error) {
      // Cleanup failing just means a stale token gets retried next time —
      // not worth surfacing as a real error.
      trackApiError('push:cleanup-stale-tokens', error);
    }
  }
}

/** Looks up push tokens for a set of user ids in one batched read. */
export async function getPushTokensForUsers(userIds: string[]): Promise<{ userId: string; tokens: string[] }[]> {
  if (userIds.length === 0) return [];
  const db = getAdminFirestore();
  const uniqueIds = [...new Set(userIds)];
  const docs = await db.getAll(...uniqueIds.map((id) => db.collection('users').doc(id)));
  return docs
    .map((snap) => ({
      userId: snap.id,
      tokens: Array.isArray(snap.data()?.pushTokens) ? (snap.data()!.pushTokens as string[]) : [],
    }))
    .filter((r) => r.tokens.length > 0);
}
