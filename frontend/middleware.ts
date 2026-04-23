import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

export async function middleware(request: NextRequest) {
  // Check for token in cookies
  const token = request.cookies.get('token')?.value;
  const subscriptionActive = request.cookies.get('subscription_active')?.value;

  // If accessing login/forgot-password pages with valid token, redirect to dashboard
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

  // If no token, redirect to login
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search));
    return NextResponse.redirect(loginUrl);
  }

  // Check subscription status for school users (not super admin)
  if (request.nextUrl.pathname.startsWith('/dashboard/school') && token) {
    const role = request.cookies.get('role')?.value;

    // Super admin bypass subscription check
    if (role === 'SUPER_ADMIN') {
      return NextResponse.next();
    }

    // Check subscription status from cookie
    // The cookie should be set during login
    if (subscriptionActive === 'false') {
      // Redirect to subscription expired page or login with message
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'subscription_expired');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}
