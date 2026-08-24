const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:9002';

export type ApiEnvelope<T> = {
  data: T;
};

export async function apiPost<T>(path: string, token: string | null, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
