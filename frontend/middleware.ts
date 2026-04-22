import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

export function middleware(request: NextRequest) {
  // Check for token in cookies
  const token = request.cookies.get('token')?.value;

  // If on login page but already have token, redirect to role dashboard
  if (request.nextUrl.pathname.startsWith('/login') && token) {
    const role = request.cookies.get('role')?.value || 'school';
    const rolePath = role.toLowerCase() === 'super_admin' ? '/dashboard/admin' : '/dashboard/school';
    return NextResponse.redirect(new URL(rolePath, request.url));
  }
  
  // Skip auth checks for login/forgot pages
  if (request.nextUrl.pathname.startsWith('/login') || 
      request.nextUrl.pathname.startsWith('/forgot-password')) {
    return NextResponse.next();
  }

  console.log('[MIDDLEWARE] Dashboard route, token:', token ? 'present' : 'missing');

  // If protected route and no token -> login
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

