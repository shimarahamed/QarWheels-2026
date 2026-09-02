import type { NextRequest } from 'next/server';

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const CLOCK_SKEW_SECONDS = 300;

type FirebaseJwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type FirebaseJwk = JsonWebKey & {
  kid?: string;
};

export type VerifiedFirebaseUser = {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  signInProvider?: string;
  claims: Record<string, unknown>;
};

let certCache:
  | {
      expiresAt: number;
      keys: Record<string, JsonWebKey>;
    }
  | undefined;

function getFirebaseProjectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function decodeJson<T>(value: string): T {
  const decoded = new TextDecoder().decode(decodeBase64Url(value));
  return JSON.parse(decoded) as T;
}

function parseMaxAge(cacheControl: string | null) {
  const match = cacheControl?.match(/max-age=(\d+)/);
  return match ? Number(match[1]) * 1000 : 60 * 60 * 1000;
}

async function getFirebaseKeys() {
  const now = Date.now();
  if (certCache && certCache.expiresAt > now) {
    return certCache.keys;
  }

  const response = await fetch(FIREBASE_JWKS_URL);
  if (!response.ok) {
    throw new Error('Unable to fetch Firebase public keys');
  }

  const jwks = (await response.json()) as { keys?: FirebaseJwk[] };
  const keys = Object.fromEntries(
    (jwks.keys ?? []).filter((key) => key.kid).map((key) => [key.kid as string, key])
  );
  certCache = {
    keys,
    expiresAt: now + parseMaxAge(response.headers.get('cache-control')),
  };

  return keys;
}

async function importPublicKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

function validateClaims(claims: Record<string, unknown>) {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error('Firebase project ID is not configured');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const issuer = `https://securetoken.google.com/${projectId}`;

  if (claims.aud !== projectId) throw new Error('Invalid token audience');
  if (claims.iss !== issuer) throw new Error('Invalid token issuer');
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
    throw new Error('Invalid token subject');
  }
  if (claims.sub.length > 128) throw new Error('Invalid token subject length');
  if (typeof claims.exp !== 'number' || claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) {
    throw new Error('Token has expired');
  }
  if (typeof claims.iat !== 'number' || claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new Error('Token issued in the future');
  }
}

export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson<FirebaseJwtHeader>(encodedHeader);
  const claims = decodeJson<Record<string, unknown>>(encodedPayload);

  if (header.alg !== 'RS256') throw new Error('Unsupported token algorithm');
  if (!header.kid) throw new Error('Token is missing a key ID');

  const keys = await getFirebaseKeys();
  const jwk = keys[header.kid];
  if (!jwk) throw new Error('Unknown token key ID');

  const publicKey = await importPublicKey(jwk);
  const isValidSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  if (!isValidSignature) throw new Error('Invalid token signature');

  validateClaims(claims);

  const firebase = claims.firebase as Record<string, unknown> | undefined;

  return {
    uid: claims.sub as string,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    emailVerified: typeof claims.email_verified === 'boolean' ? claims.email_verified : undefined,
    signInProvider:
      typeof firebase?.sign_in_provider === 'string' ? firebase.sign_in_provider : undefined,
    claims,
  };
}

export async function getVerifiedUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('qw-session')?.value;
  if (!token) return null;

  try {
    return await verifyFirebaseIdToken(token);
  } catch {
    return null;
  }
}
