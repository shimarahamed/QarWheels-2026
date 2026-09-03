import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './src/lib/security-headers';

// Content-Security-Policy is intentionally NOT set here. It's set in
// middleware.ts instead, because CSP needs a per-request nonce to drop
// 'unsafe-inline' from script-src (see src/lib/security-headers.ts for the
// full rationale) — a value only middleware can generate per-request.
// Setting CSP in both places would not "override" cleanly: Next.js applies
// header sources independently, so a duplicate Content-Security-Policy
// header from here would be sent ALONGSIDE middleware's, and browsers
// intersect multiple CSP headers rather than letting one win — silently
// blocking the nonce'd script since this static policy has no nonce in it.
//
// The other headers below have no per-request variation, so they're safe
// to set here as a backstop for any response middleware's matcher doesn't
// reach (e.g. certain static assets) — middleware sets the same values for
// everything it does cover, so there's no conflict for those.
const securityHeaders = SECURITY_HEADERS;

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
        headers: [...securityHeaders],
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
