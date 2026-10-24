import { describe, it, expect } from 'vitest';
import { decideAccess, isPublicRequest } from '../access-policy';

const anonymous = (method: string, pathname: string, search = '') =>
  decideAccess({ method, pathname, search, hasSessionCookie: false });

describe('decideAccess (fast gate, cookie presence only)', () => {
  it.each([
    ['GET', '/login'],
    ['POST', '/api/auth/login'],
    ['POST', '/api/auth/logout'],
  ])('lets anyone reach %s %s', (method, pathname) => {
    for (const hasSessionCookie of [true, false]) {
      expect(decideAccess({ method, pathname, search: '', hasSessionCookie })).toEqual({ kind: 'allow' });
    }
  });

  it.each([
    ['GET', '/api/auth/login'],
    ['GET', '/api/auth/logout'],
    ['DELETE', '/api/auth/login'],
    ['PUT', '/api/auth/logout'],
    ['POST', '/login'],
  ])('keeps %s %s private: only the method the route really serves is public', (method, pathname) => {
    expect(anonymous(method, pathname).kind).not.toBe('allow');
  });

  it('sends a visitor without a session cookie to the login screen, remembering the page', () => {
    expect(anonymous('GET', '/dashboard')).toEqual({ kind: 'redirect-to-login', next: '/dashboard' });
  });

  it('remembers the query string too', () => {
    expect(anonymous('GET', '/asignaciones/3', '?sala=B')).toEqual({
      kind: 'redirect-to-login',
      next: '/asignaciones/3?sala=B',
    });
  });

  it('answers 401 to private API calls without a session cookie', () => {
    for (const pathname of ['/api/usuario/4', '/api/asignaciones/sync', '/api/informe/export']) {
      expect(anonymous('GET', pathname)).toEqual({ kind: 'unauthorized' });
    }
    expect(anonymous('GET', '/api/informe')).toEqual({ kind: 'unauthorized' });
  });

  it('lets a request that carries a session cookie through: the real check happens on the server', () => {
    for (const [method, pathname] of [
      ['GET', '/dashboard'],
      ['GET', '/api/informe'],
      ['DELETE', '/api/informe/3'],
    ]) {
      expect(decideAccess({ method, pathname, search: '', hasSessionCookie: true })).toEqual({ kind: 'allow' });
    }
  });

  it.each(['/loginx', '/login/extra', '/api/auth', '/api/auth/loginx', '/api/authx/login', '/api/auth/login/extra'])(
    'does not treat the lookalike %s as public',
    (pathname) => {
      expect(anonymous('GET', pathname).kind).not.toBe('allow');
    }
  );
});

describe('the public data-entry flow (S7)', () => {
  it.each([
    ['GET', '/'],
    ['GET', '/grupo'],
    ['GET', '/grupo/3'],
    ['GET', '/grupo/12'],
    ['POST', '/api/informe'],
  ])('lets an anonymous visitor reach %s %s', (method, pathname) => {
    expect(isPublicRequest(method, pathname)).toBe(true);
    expect(anonymous(method, pathname)).toEqual({ kind: 'allow' });
  });

  it('accepts the method in any letter case', () => {
    expect(isPublicRequest('post', '/api/informe')).toBe(true);
  });

  it.each([
    // everything else on the same API route stays private
    ['GET', '/api/informe'],
    ['PUT', '/api/informe'],
    ['PATCH', '/api/informe'],
    ['DELETE', '/api/informe'],
    ['HEAD', '/api/informe'],
    ['OPTIONS', '/api/informe'],
    ['POST', '/api/informe/'],
    ['POST', '/api/informe/ultimo'],
    ['POST', '/api/informe/export'],
    ['PATCH', '/api/informe/3'],
    ['DELETE', '/api/informe/3'],
    ['GET', '/api/informe/3'],
    // sibling and lookalike routes
    ['POST', '/api/informes'],
    ['POST', '/api/informe/3/extra'],
    ['POST', '/api/usuario'],
    ['POST', '/api/grupos'],
    ['POST', '/api/cuentas'],
    ['POST', '/api/asignaciones/sync'],
    // the pages around the public flow stay private
    ['GET', '/dashboard'],
    ['GET', '/dashboard/cuentas'],
    ['GET', '/dashboard/publicadores'],
    ['GET', '/asignaciones'],
    ['GET', '/asignaciones/3'],
    ['GET', '/usuario'],
    ['GET', '/usuario/nuevo'],
    ['GET', '/usuario/editar/3'],
    // lookalikes of the public pages
    ['GET', '/grupox'],
    ['GET', '/grupo/'],
    ['GET', '/grupo/abc'],
    ['GET', '/grupo/3/extra'],
    ['GET', '/grupo/3x'],
    ['GET', '/grupo/-1'],
    ['GET', '/grupo/3/imprimir'],
    ['GET', '/GRUPO/3'],
    ['GET', '//grupo/3'],
    ['GET', '/grupo/../dashboard'],
  ])('keeps %s %s private', (method, pathname) => {
    expect(isPublicRequest(method, pathname)).toBe(false);
    expect(anonymous(method, pathname).kind).not.toBe('allow');
  });

  it('answers 401 (not a redirect) to a private API call even next to the public one', () => {
    expect(anonymous('GET', '/api/informe')).toEqual({ kind: 'unauthorized' });
    expect(anonymous('DELETE', '/api/informe/3')).toEqual({ kind: 'unauthorized' });
  });

  it('keeps the sign-in page and the login and logout routes public', () => {
    expect(isPublicRequest('GET', '/login')).toBe(true);
    expect(isPublicRequest('POST', '/api/auth/login')).toBe(true);
    expect(isPublicRequest('POST', '/api/auth/logout')).toBe(true);
    expect(isPublicRequest('GET', '/api/auth/session')).toBe(false);
  });
});
