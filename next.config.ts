import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // 'unsafe-eval' dropped — Next.js production builds don't need it
      // (only some dev-mode tooling does); keeping it in prod widens the
      // XSS blast radius for no production benefit. 'unsafe-inline' stays
      // for now: Next.js/React can emit inline scripts/styles that a
      // nonce-based CSP would require deeper build-pipeline changes to
      // support — tracked as a follow-up, not silently dropped here.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://placehold.co https://images.unsplash.com https://picsum.photos https://api.dicebear.com",
      "connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://generativelanguage.googleapis.com https://vpic.nhtsa.dot.gov",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  // HSTS: only meaningful over HTTPS, but the header itself is safe to send
  // unconditionally — browsers just ignore it on plain HTTP. 1 year +
  // includeSubDomains is the standard production baseline; omit 'preload'
  // until the domain is actually submitted to the HSTS preload list (adding
  // preload without submitting doesn't do anything, but the header value
  // implies an intent this project hasn't taken yet).
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    return [
      { source: '/register', destination: '/signup', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
    ],
  },
};

export default nextConfig;
