import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';

const CUSTOMER_PROTECTED = /^\/dashboard/;
const VENDOR_PROTECTED = /^\/vendor\/dashboard/;
const ADMIN_PROTECTED = /^\/admin\/dashboard/;

// Routes that authenticated users should not see
const AUTH_ROUTES = /^\/(login|signup|vendor\/login|vendor\/signup)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const verifiedUser = await getVerifiedUserFromRequest(request);
  const isAuthenticated = Boolean(verifiedUser);

  // Redirect unauthenticated users away from protected routes
  if (CUSTOMER_PROTECTED.test(pathname) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(url);
    response.cookies.delete('qw-session');
    return response;
  }

  if (VENDOR_PROTECTED.test(pathname) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/vendor/login';
    url.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(url);
    response.cookies.delete('qw-session');
    return response;
  }

  if (ADMIN_PROTECTED.test(pathname) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(url);
    response.cookies.delete('qw-session');
    return response;
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
