// Shared between middleware.ts (per-request, nonce-aware — covers every
// page response) and next.config.ts (static fallback for any response
// middleware's matcher doesn't reach, so nothing is ever left unheadered).
//
// The nonce lets script-src drop 'unsafe-inline': a fresh, unguessable
// value is generated per request, threaded onto the one inline script in
// src/app/layout.tsx via the `nonce` attribute, and only that exact value
// is allowed by the CSP header sent for that same request. An attacker's
// injected <script> has no way to know the nonce in advance, so it's
// blocked even though the page's own legitimate inline script isn't.
// style-src keeps 'unsafe-inline' — Tailwind's arbitrary-value classes and
// several UI primitives (Radix, inline style props) emit inline styles
// throughout the app; nonce-ing every one of those is a much larger,
// separate effort than the single inline script this pass addresses.

export function generateNonce(): string {
  // 16 random bytes, base64-encoded — matches the entropy Next.js's own
  // CSP example uses. crypto.randomUUID() would also work but produces a
  // less compact value for the same purpose.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function buildCsp(nonce: string | null): string {
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    // Static fallback (no nonce available, e.g. next.config.ts's headers()
    // for a response middleware didn't run for) — falls back to
    // 'unsafe-inline' rather than blocking the theme-init script outright.
    : "script-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://placehold.co https://images.unsplash.com https://picsum.photos https://api.dicebear.com",
    "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://generativelanguage.googleapis.com https://vpic.nhtsa.dot.gov",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}

// Headers with no per-request variation — safe to reuse as-is in both
// middleware and next.config.ts.
export const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // HSTS: only meaningful over HTTPS, but the header itself is safe to send
  // unconditionally — browsers just ignore it on plain HTTP. 1 year +
  // includeSubDomains is the standard production baseline; omit 'preload'
  // until the domain is actually submitted to the HSTS preload list.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
] as const;
