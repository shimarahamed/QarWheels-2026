import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { readQwClaims } from '@/lib/auth/qw-claims';

// NOT YET SAFE TO DEPLOY: role checks below require every vendor/admin
// account to carry a `qw` custom claim, which is only minted once the
// memberships collection + syncClaimsForUser + vendor register/staff invite
// routes exist and the re-seed has run. Until then this redirects every
// existing vendor/admin out of their own dashboard. Land this only as the
// final step of the Phase 1 rollout, after claims are backfilled for all
// seeded/existing accounts.

const CUSTOMER_PROTECTED = /^\/dashboard/;
const VENDOR_PROTECTED = /^\/vendor\/dashboard/;
const ADMIN_PROTECTED = /^\/admin\/dashboard/;

// Roles that may pass the vendor-dashboard gate — any active business
// membership. Plain customers (no qw claim) are redirected out.
const VENDOR_ROLES = new Set(['business_owner', 'business_admin', 'branch_manager', 'branch_staff']);

// Routes that authenticated users should not see
const AUTH_ROUTES = /^\/(login|signup|vendor\/login|vendor\/signup)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    return response;
  }

  if (VENDOR_PROTECTED.test(pathname)) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/vendor/login';
      url.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(url);
      response.cookies.delete('qw-session');
      return response;
    }
    // Authenticated but not a business member (e.g. a plain customer who
    // navigated here directly) — bounce to the customer dashboard rather
    // than letting them through to see the vendor shell.
    if (!VENDOR_ROLES.has(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (ADMIN_PROTECTED.test(pathname)) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(url);
      response.cookies.delete('qw-session');
      return response;
    }
    if (role !== 'master_admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.test(pathname) && isAuthenticated) {
    const redirect = request.nextUrl.searchParams.get('redirect');
    const url = request.nextUrl.clone();
    url.pathname = redirect ?? (pathname.startsWith('/vendor') ? '/vendor/dashboard' : '/dashboard');
    url.search = '';
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  if (verifiedUser) {
    requestHeaders.set('x-user-id', verifiedUser.uid);
    if (verifiedUser.signInProvider) {
      requestHeaders.set('x-sign-in-provider', verifiedUser.signInProvider);
    }
    if (claims) {
      requestHeaders.set('x-qw-role', claims.r);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/vendor/dashboard/:path*',
    '/admin/dashboard/:path*',
    '/login',
    '/signup',
    '/vendor/login',
    '/vendor/signup',
    '/api/:path*',
  ],
};
