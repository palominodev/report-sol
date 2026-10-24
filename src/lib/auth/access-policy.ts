/**
 * Fast gate for the edge middleware. It only looks at whether a session cookie is
 * PRESENT: the database cannot be queried from the edge. It stops anonymous visitors
 * early; the real check (is the session valid, is the account active) always happens
 * again on the server in `withAuth` and `requireAccount`.
 */
const PUBLIC_PATHS: ReadonlySet<string> = new Set(['/login', '/api/auth/login', '/api/auth/logout']);

export type AccessDecision =
  | { kind: 'allow' }
  | { kind: 'redirect-to-login'; next: string }
  | { kind: 'unauthorized' };

export interface AccessRequest {
  pathname: string;
  search: string;
  hasSessionCookie: boolean;
}

export function decideAccess({ pathname, search, hasSessionCookie }: AccessRequest): AccessDecision {
  if (PUBLIC_PATHS.has(pathname)) return { kind: 'allow' };
  if (hasSessionCookie) return { kind: 'allow' };
  if (pathname === '/api' || pathname.startsWith('/api/')) return { kind: 'unauthorized' };
  return { kind: 'redirect-to-login', next: `${pathname}${search}` };
}
