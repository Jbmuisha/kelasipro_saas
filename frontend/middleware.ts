import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  // If protected route and no token -> login
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    const loginUrl = '/login?returnTo=' + encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  return NextResponse.next();
}

