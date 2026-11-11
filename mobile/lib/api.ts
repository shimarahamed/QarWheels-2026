import { Platform } from 'react-native';

export function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const base = configured || (__DEV__ && Platform.OS === 'web' ? 'http://localhost:9002' : '');
  if (!base) throw new Error('Backend API is not configured for this build.');
  let url: URL;
  try { url = new URL(base); } catch { throw new Error('Backend API URL is invalid.'); }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Backend API URL must not contain credentials or query parameters.');
  }
  if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) {
    throw new Error('Backend API requires HTTPS.');
  }
  if (Platform.OS !== 'web' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Backend API must use a device-reachable address.');
  }
  return url.origin + url.pathname.replace(/\/$/, '');
}

export type ApiEnvelope<T> = {
  data: T;
};

export async function apiGet<T>(path: string, token: string | null): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Same reasoning as apiPost: without a timeout a stalled connection leaves
    // the calling screen spinning forever.
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? 'Request failed');
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export async function apiPost<T>(path: string, token: string | null, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    // Without this a stalled connection hangs the caller forever; every
    // screen awaiting it shows a spinner that never resolves.
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? 'Request failed');
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}
