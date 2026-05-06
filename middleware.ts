/**
 * Middleware - Password Protection
 * Ensures all routes except root and admin require demo access
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to:
  // - Root (password page)
  // - Admin routes (have their own security)
  // - API routes
  // - Static files
  if (
    pathname === '/' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for demo access cookie
  const hasAccess = request.cookies.get('demo_access');

  if (!hasAccess || hasAccess.value !== 'granted') {
    // Redirect to password gate
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
