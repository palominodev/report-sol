import { describe, expect, it, vi } from 'vitest';
import { NETWORK_MESSAGE, SESSION_NOT_KEPT_MESSAGE, signInWithPassword } from '../login-client';

const account = { id: 1, username: 'ana', rol: 'normal', activa: true };

type Step = { status: number; body?: unknown; raw?: string } | Error;

/** A fetch that answers the given steps in order and records the calls. */
function script(...steps: Step[]) {
  const queue = [...steps];
  return vi.fn(async () => {
    const step = queue.shift();
    if (!step) throw new Error('unexpected extra request');
    if (step instanceof Error) throw step;
    return new Response(step.raw ?? JSON.stringify(step.body ?? {}), { status: step.status });
  });
}

describe('signInWithPassword', () => {
  it('posts the credentials, then confirms the browser kept the session, and succeeds', async () => {
    const fetchFn = script({ status: 200, body: { account } }, { status: 200, body: { account } });

    const result = await signInWithPassword('ana', 'secreto-ana', fetchFn);

    expect(result).toEqual({ ok: true, account });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const [loginUrl, loginInit] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(loginUrl).toBe('/api/auth/login');
    expect(loginInit.method).toBe('POST');
    expect(loginInit.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(loginInit.body as string)).toEqual({ username: 'ana', password: 'secreto-ana' });
    const [checkUrl, checkInit] = fetchFn.mock.calls[1] as unknown as [string, RequestInit | undefined];
    expect(checkUrl).toBe('/api/auth/session');
    expect(checkInit?.cache).toBe('no-store');
  });

  it('says the session was not kept when the check answers 401 after a successful login', async () => {
    const fetchFn = script({ status: 200, body: { account } }, { status: 401, body: { error: 'Necesitás iniciar sesión.' } });

    const result = await signInWithPassword('ana', 'secreto-ana', fetchFn);

    expect(result).toEqual({ ok: false, kind: 'session-not-kept', message: SESSION_NOT_KEPT_MESSAGE });
  });

  it('explains the likely cause of a dropped session in plain words', () => {
    expect(SESSION_NOT_KEPT_MESSAGE).toMatch(/navegador no guard/);
    expect(SESSION_NOT_KEPT_MESSAGE).toMatch(/https/i);
  });

  it('does not block a good login because the confirmation could not be made (network error)', async () => {
    const fetchFn = script({ status: 200, body: { account } }, new TypeError('offline'));

    expect(await signInWithPassword('ana', 'secreto-ana', fetchFn)).toEqual({ ok: true, account });
  });

  it('does not block a good login because the confirmation failed on the server (5xx)', async () => {
    const fetchFn = script({ status: 200, body: { account } }, { status: 500, body: { error: 'x' } });

    expect(await signInWithPassword('ana', 'secreto-ana', fetchFn)).toEqual({ ok: true, account });
  });

  it('returns the server message for wrong credentials and never asks for the session', async () => {
    const fetchFn = script({ status: 401, body: { error: 'Usuario o contraseña incorrectos.' } });

    const result = await signInWithPassword('ana', 'mal', fetchFn);

    expect(result).toEqual({ ok: false, kind: 'credentials', message: 'Usuario o contraseña incorrectos.' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each([400, 413, 500])('maps %s to server with the body message and no session check', async (status) => {
    const fetchFn = script({ status, body: { error: 'Mensaje del servidor' } });

    expect(await signInWithPassword('ana', 'x', fetchFn)).toEqual({
      ok: false,
      kind: 'server',
      message: 'Mensaje del servidor',
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('uses a generic message when the error body is not JSON', async () => {
    const fetchFn = script({ status: 502, raw: '<html>bad gateway</html>' });

    expect(await signInWithPassword('ana', 'x', fetchFn)).toEqual({
      ok: false,
      kind: 'server',
      message: 'No se pudo iniciar sesión. Intentá de nuevo.',
    });
  });

  it('reports a network failure on the login request itself', async () => {
    const fetchFn = script(new TypeError('offline'));

    expect(await signInWithPassword('ana', 'x', fetchFn)).toEqual({
      ok: false,
      kind: 'network',
      message: NETWORK_MESSAGE,
    });
  });

  it('treats a 200 without an account body as a server problem, not a success', async () => {
    const fetchFn = script({ status: 200, raw: 'not json' });

    const result = await signInWithPassword('ana', 'x', fetchFn);

    expect(result).toMatchObject({ ok: false, kind: 'server' });
  });
});
