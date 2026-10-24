/**
 * Fast gate for the edge middleware. It only looks at whether a session cookie is
 * PRESENT: the database cannot be queried from the edge. It stops anonymous visitors
 * early; the real check (is the session valid, is the account active) always happens
 * again on the server in `withAuth` and `requireAccount`.
 *
 * WHAT IS PUBLIC is decided in ONE place, `isPublicRequest` below. The structural test
 * (src/app/__tests__/everything-is-guarded.test.ts) reads the same function, so a page
 * or route is public only if it is listed here AND does not call the guard, and private
 * only if it calls it. Matching is by exact path or an exact pattern, never by prefix.
 */

/** The sign-in screen: a page, so only reading it is public. */
const LOGIN_PAGE = '/login';

/**
 * Public data entry (S7): the home page, the group list and one group's members, where
 * a publisher picks their name and submits their report. Read-only pages.
 */
const PUBLIC_PAGE_PATHS: ReadonlySet<string> = new Set(['/', '/grupo']);
const PUBLIC_GROUP_PAGE = /^\/grupo\/[1-9][0-9]{0,9}$/;

/** The only public API call: sending a report. Every other method on it, and every other route, stays private. */
const PUBLIC_API_CALLS: ReadonlyArray<{ method: string; path: string }> = [
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/logout' },
  { method: 'POST', path: '/api/informe' },
];

export function isPublicRequest(method: string, pathname: string): boolean {
  const verb = method.toUpperCase();
  if (verb === 'GET' && (pathname === LOGIN_PAGE || PUBLIC_PAGE_PATHS.has(pathname) || PUBLIC_GROUP_PAGE.test(pathname))) {
    return true;
  }
  return PUBLIC_API_CALLS.some((call) => call.method === verb && call.path === pathname);
}

export type AccessDecision =
  | { kind: 'allow' }
  | { kind: 'redirect-to-login'; next: string }
  | { kind: 'unauthorized' };

export interface AccessRequest {
  method: string;
  pathname: string;
  search: string;
  hasSessionCookie: boolean;
}

export function decideAccess({ method, pathname, search, hasSessionCookie }: AccessRequest): AccessDecision {
  if (isPublicRequest(method, pathname)) return { kind: 'allow' };
  if (hasSessionCookie) return { kind: 'allow' };
  if (pathname === '/api' || pathname.startsWith('/api/')) return { kind: 'unauthorized' };
  return { kind: 'redirect-to-login', next: `${pathname}${search}` };
}
