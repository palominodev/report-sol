import { describe, expect, it, vi } from 'vitest';
import { createAccount, logout, setAccountActive } from '../accounts-client';

const cuenta = { id: 7, username: 'ana', rol: 'normal', activa: true };

function reply(status: number, body: unknown, raw = false) {
  return vi.fn(async () => new Response(raw ? (body as string) : JSON.stringify(body), { status }));
}

const NETWORK = 'No hay conexión con el servidor. Revisá tu conexión e intentá de nuevo.';

describe('createAccount', () => {
  it('POSTs JSON to /api/cuentas and returns the created account on 201', async () => {
    const fetchFn = reply(201, { cuenta });
    const result = await createAccount({ username: 'ana', password: 'secreta-larga', rol: 'normal' }, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/cuentas');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ username: 'ana', password: 'secreta-larga', rol: 'normal' });
    expect(result).toEqual({ ok: true, cuenta });
  });

  it.each([400, 409, 422, 500])('maps %s to server with the body error', async (status) => {
    const result = await createAccount({ username: 'a', password: 'b', rol: 'normal' }, reply(status, { error: 'Mensaje del servidor' }));
    expect(result).toEqual({ ok: false, kind: 'server', message: 'Mensaje del servidor' });
  });

  it('maps 401 to unauthorized', async () => {
    const result = await createAccount({ username: 'a', password: 'b', rol: 'normal' }, reply(401, { error: 'x' }));
    expect(result).toMatchObject({ ok: false, kind: 'unauthorized' });
  });

  it('maps 403 to forbidden with the fixed message', async () => {
    const result = await createAccount({ username: 'a', password: 'b', rol: 'normal' }, reply(403, { error: 'x' }));
    expect(result).toEqual({ ok: false, kind: 'forbidden', message: 'No tenés permiso para hacer esto.' });
  });

  it('uses a generic message when the error body is not JSON', async () => {
    const result = await createAccount({ username: 'a', password: 'b', rol: 'normal' }, reply(502, '<html>Bad gateway</html>', true));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('server');
      expect(result.message).toBe('No se pudo completar la operación. Intentá de nuevo.');
    }
  });

  it('uses a generic message when the JSON body has no error string', async () => {
    const result = await createAccount({ username: 'a', password: 'b', rol: 'normal' }, reply(500, { error: 5 }));
    expect(result).toMatchObject({ ok: false, kind: 'server', message: 'No se pudo completar la operación. Intentá de nuevo.' });
  });

  it('maps a thrown fetch to network', async () => {
    const fetchFn = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    expect(await createAccount({ username: 'a', password: 'b', rol: 'normal' }, fetchFn)).toEqual({ ok: false, kind: 'network', message: NETWORK });
  });

  it('treats a 201 without a usable cuenta as a server failure', async () => {
    const result = await createAccount({ username: 'a', password: 'b', rol: 'normal' }, reply(201, {}));
    expect(result).toMatchObject({ ok: false, kind: 'server' });
  });
});

describe('setAccountActive', () => {
  it.each([false, true])('PATCHes /api/cuentas/<id> with {activa:%s}', async (activa) => {
    const fetchFn = reply(200, { cuenta: { ...cuenta, activa } });
    const result = await setAccountActive(7, activa, fetchFn);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/cuentas/7');
    expect(init.method).toBe('PATCH');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ activa });
    expect(result).toEqual({ ok: true, cuenta: { ...cuenta, activa } });
  });

  it('maps 422 (last active administrator) to server with the message', async () => {
    const result = await setAccountActive(1, false, reply(422, { error: 'Debe quedar al menos un administrador activo.' }));
    expect(result).toEqual({ ok: false, kind: 'server', message: 'Debe quedar al menos un administrador activo.' });
  });

  it('maps 401, 403 and network', async () => {
    expect(await setAccountActive(1, false, reply(401, {}))).toMatchObject({ ok: false, kind: 'unauthorized' });
    expect(await setAccountActive(1, false, reply(403, {}))).toEqual({ ok: false, kind: 'forbidden', message: 'No tenés permiso para hacer esto.' });
    const boom = vi.fn(async () => { throw new Error('offline'); });
    expect(await setAccountActive(1, false, boom)).toEqual({ ok: false, kind: 'network', message: NETWORK });
  });

  it('handles a non-JSON error body', async () => {
    expect(await setAccountActive(1, true, reply(500, 'oops', true))).toMatchObject({ ok: false, kind: 'server' });
  });
});

describe('logout', () => {
  it('POSTs to /api/auth/logout and returns ok', async () => {
    const fetchFn = reply(200, { ok: true });
    expect(await logout(fetchFn)).toEqual({ ok: true });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/auth/logout');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('maps failures: 500 server, 401 unauthorized, thrown network', async () => {
    expect(await logout(reply(500, { error: 'Falló' }))).toEqual({ ok: false, kind: 'server', message: 'Falló' });
    expect(await logout(reply(401, {}))).toMatchObject({ ok: false, kind: 'unauthorized' });
    expect(await logout(vi.fn(async () => { throw new Error('x'); }))).toEqual({ ok: false, kind: 'network', message: NETWORK });
  });
});
