import { describe, it, expect } from 'vitest';
import { decideAccess } from '../access-policy';

describe('decideAccess (fast gate, cookie presence only)', () => {
  it.each(['/login', '/api/auth/login', '/api/auth/logout'])('lets anyone reach %s', (pathname) => {
    for (const hasSessionCookie of [true, false]) {
      expect(decideAccess({ pathname, search: '', hasSessionCookie })).toEqual({ kind: 'allow' });
    }
  });

  it('sends a visitor without a session cookie to the login screen, remembering the page', () => {
    expect(decideAccess({ pathname: '/dashboard', search: '', hasSessionCookie: false })).toEqual({
      kind: 'redirect-to-login',
      next: '/dashboard',
    });
  });

  it('remembers the query string too', () => {
    expect(
      decideAccess({ pathname: '/asignaciones/3', search: '?sala=B', hasSessionCookie: false })
    ).toEqual({ kind: 'redirect-to-login', next: '/asignaciones/3?sala=B' });
  });

  it('answers 401 to API calls without a session cookie', () => {
    for (const pathname of ['/api/informe', '/api/usuario/4', '/api/asignaciones/sync', '/api/informe/export']) {
      expect(decideAccess({ pathname, search: '', hasSessionCookie: false })).toEqual({ kind: 'unauthorized' });
    }
  });

  it('lets a request that carries a session cookie through: the real check happens on the server', () => {
    expect(decideAccess({ pathname: '/dashboard', search: '', hasSessionCookie: true })).toEqual({ kind: 'allow' });
    expect(decideAccess({ pathname: '/api/informe', search: '', hasSessionCookie: true })).toEqual({ kind: 'allow' });
  });

  it.each(['/loginx', '/login/extra', '/api/auth', '/api/auth/loginx', '/api/authx/login', '/api/auth/login/extra'])(
    'does not treat the lookalike %s as public',
    (pathname) => {
      expect(decideAccess({ pathname, search: '', hasSessionCookie: false }).kind).not.toBe('allow');
    }
  );
});
