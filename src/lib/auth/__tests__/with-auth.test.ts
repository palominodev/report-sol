import { describe, it, expect, vi, afterEach } from 'vitest';
import { createWithAuth } from '../with-auth';
import { SESSION_COOKIE_NAME } from '../session-cookie';
import type { Account } from '@/core/domain/auth/Account';

const admin: Account = { id: 1, username: 'ana', rol: 'administrador', activa: true };
const normal: Account = { id: 2, username: 'beto', rol: 'normal', activa: true };

function request(cookie?: string) {
  return new Request('http://localhost/api/x', { headers: cookie ? { cookie } : {} });
}

const session = (token: string) => `${SESSION_COOKIE_NAME}=${token}`;

afterEach(() => vi.restoreAllMocks());

describe('withAuth', () => {
  it('runs the handler for a live session, passing the request, the route context and the account', async () => {
    const validate = vi.fn().mockResolvedValue(admin);
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 201 }));
    const guarded = createWithAuth(validate)(handler);
    const req = request(session('abc'));
    const context = { params: Promise.resolve({ id: '7' }) };

    const response = await guarded(req, context);

    expect(response.status).toBe(201);
    expect(handler).toHaveBeenCalledWith(req, context, admin);
    expect(validate).toHaveBeenCalledWith('abc');
  });

  it('answers 401 and never runs the handler when there is no session cookie', async () => {
    const validate = vi.fn();
    const handler = vi.fn();

    const response = await createWithAuth(validate)(handler)(request(), undefined);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Necesitás iniciar sesión.' });
    expect(handler).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
  });

  it('answers 401 and never runs the handler for an unknown, expired or revoked token', async () => {
    const validate = vi.fn().mockResolvedValue(null);
    const handler = vi.fn();

    const response = await createWithAuth(validate)(handler)(request(session('forged')), undefined);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('finds the session cookie among other cookies', async () => {
    const validate = vi.fn().mockResolvedValue(admin);

    await createWithAuth(validate)(async () => new Response('ok'))(
      request(`theme=dark; ${session('abc')}; other=1`),
      undefined
    );

    expect(validate).toHaveBeenCalledWith('abc');
  });

  it('fails closed: if the session cannot be checked, answers 500 without leaking details and runs nothing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const validate = vi.fn().mockRejectedValue(new Error('libsql: connection refused at turso.io'));
    const handler = vi.fn();

    const response = await createWithAuth(validate)(handler)(request(session('abc')), undefined);

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toMatch(/libsql|turso|refused/i);
    expect(handler).not.toHaveBeenCalled();
  });

  it('answers 403 to an account without the required role and runs nothing', async () => {
    const validate = vi.fn().mockResolvedValue(normal);
    const handler = vi.fn();

    const response = await createWithAuth(validate)(handler, { role: 'administrador' })(
      request(session('abc')),
      undefined
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'No tenés permiso para hacer esto.' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('lets an administrator through a role-restricted handler', async () => {
    const validate = vi.fn().mockResolvedValue(admin);
    const handler = vi.fn().mockResolvedValue(new Response('ok'));

    const response = await createWithAuth(validate)(handler, { role: 'administrador' })(
      request(session('abc')),
      undefined
    );

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('marks refusals as not cacheable', async () => {
    const validate = vi.fn().mockResolvedValue(null);
    const unauthorized = await createWithAuth(validate)(vi.fn())(request(), undefined);
    const forbidden = await createWithAuth(vi.fn().mockResolvedValue(normal))(vi.fn(), { role: 'administrador' })(
      request(session('abc')),
      undefined
    );

    expect(unauthorized.headers.get('cache-control')).toBe('no-store');
    expect(forbidden.headers.get('cache-control')).toBe('no-store');
  });
});
