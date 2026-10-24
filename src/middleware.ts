import { NextResponse, type NextRequest } from 'next/server';
import { decideAccess } from '@/lib/auth/access-policy';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

/**
 * Fast filter for anonymous visitors. It only checks that a session cookie is present
 * (the edge cannot reach the database); the real check runs again on the server in
 * `withAuth` and `requireAccount`. Import nothing from the app beyond the two pure modules above.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const decision = decideAccess({
    pathname,
    search,
    hasSessionCookie: request.cookies.has(SESSION_COOKIE_NAME),
  });

  switch (decision.kind) {
    case 'redirect-to-login': {
      const url = new URL('/login', request.url);
      url.searchParams.set('next', decision.next);
      return NextResponse.redirect(url);
    }
    case 'unauthorized':
      return NextResponse.json(
        { error: 'Necesitás iniciar sesión.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    case 'allow':
      return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico$|icon\\.png$|opengraph-report-sol\\.jpg$|images/|file\\.svg$|globe\\.svg$|next\\.svg$|window\\.svg$).*)',
  ],
};
