import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { readQwClaims } from '@/lib/auth/qw-claims';
import { VENDOR_ROLES as VENDOR_ROLE_LIST } from '@/lib/auth/permissions';
import { buildCsp, generateNonce, SECURITY_HEADERS } from '@/lib/security-headers';

// LIVE: role checks below are active in production. They require every
// vendor/admin account to carry a `qw` custom claim — memberships,
// syncClaimsForUser, and the vendor register/staff-invite routes that mint
// it all exist (see src/lib/auth/claims.ts, src/app/api/vendor/register,
// src/app/api/vendor/staff/invite). Any account without a claim (a plain
// customer, or a stale pre-Phase-1 account that was never re-seeded/synced)
// is correctly bounced out of /vendor/dashboard and /admin/dashboard — that
// is the intended behavior, not a bug. If you're re-seeding or onboarding a
// new environment, run the seed + admin:bootstrap steps in
// docs/go-live-checklist.md BEFORE anyone tries to sign in as vendor/admin,
// or they'll be redirected here exactly as designed.

const CUSTOMER_PROTECTED = /^\/dashboard/;
const VENDOR_PROTECTED = /^\/vendor\/dashboard/;
const ADMIN_PROTECTED = /^\/admin\/dashboard/;

// Roles that may pass the vendor-dashboard gate — any active business
// membership. Plain customers (no qw claim) are redirected out. Sourced from
// permissions.ts (the single source of truth for role strings) rather than
// hand-copied here — a hand-copied list is exactly what went stale before
// (it named a set of roles retired by the vendor-role-matrix rename and
// silently bounced every real vendor_admin/manager/staff/cashier/inventory
// account out of /vendor/dashboard until this was caught).
const VENDOR_ROLES = new Set<string>(VENDOR_ROLE_LIST);

// Routes that authenticated users should not see
const AUTH_ROUTES = /^\/(login|signup|vendor\/login|vendor\/signup|admin\/login)$/;

// Stamps every outgoing response (redirect or pass-through) with the
// per-request CSP (carrying this request's nonce) and the other static
// security headers — the single place that guarantees no code path through
// this middleware can accidentally ship a response with no CSP at all.
function withSecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set('Content-Security-Policy', csp);
  for (const header of SECURITY_HEADERS) {
    response.headers.set(header.key, header.value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Nonce is generated for every request this middleware runs on (now
  // effectively every page, per the broadened matcher below) — even ones
  // that redirect, so the redirect response itself still carries a correct
  // CSP header rather than an implicit default. API routes get one too for
  // consistency, though they render no HTML and so never actually use it.
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const verifiedUser = await getVerifiedUserFromRequest(request);
  const isAuthenticated = Boolean(verifiedUser);
  // Edge runtime can't call the Admin SDK, so role is read straight off the
  // already-verified ID token's `qw` claim (see src/lib/auth/claims.ts for
  // how that claim gets minted/refreshed).
  const claims = verifiedUser ? readQwClaims(verifiedUser.claims) : null;
  const role = claims?.r ?? 'customer';

  // Redirect unauthenticated users away from protected routes
  if (CUSTOMER_PROTECTED.test(pathname) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(url);
    response.cookies.delete('qw-session');
    return withSecurityHeaders(response, csp);
  }

  // A vendor/admin-claimed account has no business being in the customer
  // area — bounce it to its own dashboard rather than letting it view (or,
  // worse, book) as a customer. Mirrors the equivalent check VENDOR_PROTECTED
  // already does in the other direction below.
  //
  // The two role tests must stay exact mirrors of each other: this sends an
  // account away only if the destination's own guard will actually admit it
  // (VENDOR_ROLES here, master_admin below), never on a loose `!= customer`.
  // A claim carrying an unrecognised role — a renamed//retired role string, a
  // hand-edited claim — matches neither set, so it stays in the customer area
  // instead of ping-ponging between two guards that each reject it.
  if (CUSTOMER_PROTECTED.test(pathname) && isAuthenticated) {
    const homeForRole = VENDOR_ROLES.has(role)
      ? '/vendor/dashboard'
      : role === 'master_admin'
        ? '/admin/dashboard'
        : null;
    if (homeForRole) {
      const url = request.nextUrl.clone();
      url.pathname = homeForRole;
      url.search = '';
      return withSecurityHeaders(NextResponse.redirect(url), csp);
    }
  }

  if (VENDOR_PROTECTED.test(pathname)) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/vendor/login';
      url.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(url);
      response.cookies.delete('qw-session');
      return withSecurityHeaders(response, csp);
    }
    // Authenticated but not a business member (e.g. a plain customer who
    // navigated here directly) — bounce to the customer dashboard rather
    // than letting them through to see the vendor shell.
    if (!VENDOR_ROLES.has(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return withSecurityHeaders(NextResponse.redirect(url), csp);
    }
  }

  if (ADMIN_PROTECTED.test(pathname)) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(url);
      response.cookies.delete('qw-session');
      return withSecurityHeaders(response, csp);
    }
    if (role !== 'master_admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return withSecurityHeaders(NextResponse.redirect(url), csp);
    }
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.test(pathname) && isAuthenticated) {
    const redirect = request.nextUrl.searchParams.get('redirect');
    const url = request.nextUrl.clone();
    url.pathname =
      redirect ??
      (pathname.startsWith('/admin')
        ? role === 'master_admin'
          ? '/admin/dashboard'
          : '/dashboard'
        : pathname.startsWith('/vendor')
          ? '/vendor/dashboard'
          : '/dashboard');
    url.search = '';
    return withSecurityHeaders(NextResponse.redirect(url), csp);
  }

  const requestHeaders = new Headers(request.headers);
  // Threaded through to src/app/layout.tsx (via next/headers) so the one
  // inline <script> there can be stamped with this exact request's nonce.
  requestHeaders.set('x-nonce', nonce);
  // Next.js's own render pipeline (app-render.js) reads the nonce for ITS
  // OWN injected scripts (hydration payload, chunk loaders) by parsing a
  // `content-security-policy` header off the INCOMING request — not the
  // outgoing response. Both request and response need this header with the
  // same nonce: the request copy is what makes Next's own scripts work
  // under a nonce'd CSP; the response copy is what the browser enforces.
  requestHeaders.set('content-security-policy', csp);
  if (verifiedUser) {
    requestHeaders.set('x-user-id', verifiedUser.uid);
    if (verifiedUser.signInProvider) {
      requestHeaders.set('x-sign-in-provider', verifiedUser.signInProvider);
    }
    if (claims) {
      requestHeaders.set('x-qw-role', claims.r);
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return withSecurityHeaders(response, csp);
}

export const config = {
  // Every page route needs the nonce-bearing CSP, not just the
  // auth-guarded ones — the inline theme-init script in src/app/layout.tsx
  // renders on every page. Excludes Next's internal static/image assets and
  // common static file extensions, which don't render the layout and don't
  // need a nonce. Plain string pattern (not the object+`missing` form) —
  // Next 15.5's build-time routes-manifest generation chokes on the
  // richer matcher shape here (`next start` throws "routesManifest.
  // dataRoutes is not iterable"), so keep this to the form Next's own docs
  // use for CSP-nonce middleware.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)',
  ],
};
