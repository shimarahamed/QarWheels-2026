// Web-Crypto-only (Edge-compatible) token generation/hashing for staff
// invites — mirrors the crypto.subtle usage already established in
// firebase-auth.ts and rate-limit.ts rather than pulling in Node's crypto.

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** A random, URL-safe invite token — the raw value goes in the invite link, never stored. */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

/** SHA-256 hash of a token — this is what's stored in staff_invites.tokenHash. */
export async function hashInviteToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}
