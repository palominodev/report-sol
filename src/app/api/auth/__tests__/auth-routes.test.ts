import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { TursoAccountRepository } from '@/infrastructure/persistence/turso-account.repository';
import { ScryptPasswordHasher } from '@/infrastructure/auth/scrypt-password-hasher';
import { getValidateSessionUseCase } from '@/infrastructure/config/di';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { POST as login } from '../login/route';
import { POST as logout } from '../logout/route';

let client: ReturnType<typeof createClient>;

const GENERIC_MESSAGE = 'Usuario o contraseña incorrectos.';

function loginRequest(body: unknown, raw = false) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

function logoutRequest(token?: string) {
  return new NextRequest('http://localhost/api/auth/logout', {
    method: 'POST',
    headers: token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : {},
  });
}

function tokenFrom(response: Response): string {
  const setCookie = response.headers.get('set-cookie') ?? '';
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) throw new Error(`no session cookie in: ${setCookie}`);
  return match[1];
}

async function sessionRows() {
  return (await client.execute('SELECT token_hash FROM sesion')).rows;
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('src/db.sql', 'utf8'));
  setDatabaseClient(client);
  vi.spyOn(console, 'error').mockImplementation(() => {});

  const accounts = new TursoAccountRepository();
  const hasher = new ScryptPasswordHasher();
  await accounts.create({ username: 'ana', passwordHash: await hasher.hash('secreto-ana'), rol: 'administrador' });
  const beto = await accounts.create({ username: 'beto', passwordHash: await hasher.hash('secreto-beto'), rol: 'normal' });
  await accounts.setActive(beto.id, false);
});

afterEach(() => {
  setDatabaseClient(null);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('POST /api/auth/login', () => {
  it('opens a session: 200, the account without any hash, and a protected session cookie', async () => {
    const response = await login(loginRequest({ username: 'ana', password: 'secreto-ana' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      account: { id: 1, username: 'ana', rol: 'administrador', activa: true },
    });

    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(/Expires=/i);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it('marks the cookie Secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const response = await login(loginRequest({ username: 'ana', password: 'secreto-ana' }));

    expect(response.headers.get('set-cookie')).toMatch(/Secure/i);
  });

  it('issues a cookie that the app recognises as the logged-in account, and stores only its hash', async () => {
    const response = await login(loginRequest({ username: 'ana', password: 'secreto-ana' }));
    const token = tokenFrom(response);

    expect(await getValidateSessionUseCase().execute(token)).toMatchObject({ username: 'ana' });

    const rows = await sessionRows();
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it('rejects a wrong password: 401, generic message, no cookie, no session', async () => {
    const response = await login(loginRequest({ username: 'ana', password: 'otra' }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: GENERIC_MESSAGE });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await sessionRows()).toHaveLength(0);
  });

  it('answers an unknown user and a deactivated account exactly like a wrong password', async () => {
    const unknown = await login(loginRequest({ username: 'nadie', password: 'secreto-ana' }));
    const inactive = await login(loginRequest({ username: 'beto', password: 'secreto-beto' }));

    for (const response of [unknown, inactive]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: GENERIC_MESSAGE });
      expect(response.headers.get('set-cookie')).toBeNull();
    }
    expect(await sessionRows()).toHaveLength(0);
  });

  it('rejects a body that is not valid JSON with 400 and no session', async () => {
    const response = await login(loginRequest('{not json', true));

    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await sessionRows()).toHaveLength(0);
  });

  it('rejects non-text credentials with 400 instead of failing', async () => {
    const response = await login(loginRequest({ username: 123, password: ['x'] }));

    expect(response.status).toBe(400);
    expect(await sessionRows()).toHaveLength(0);
  });

  it('does not leak internal errors', async () => {
    setDatabaseClient(null);
    vi.stubEnv('TURSO_URL', '');

    const response = await login(loginRequest({ username: 'ana', password: 'secreto-ana' }));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toMatch(/TURSO|libsql|sql/i);
  });
});

describe('POST /api/auth/logout', () => {
  it('closes the session and clears the cookie', async () => {
    const token = tokenFrom(await login(loginRequest({ username: 'ana', password: 'secreto-ana' })));

    const response = await logout(logoutRequest(token));

    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(cookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    expect(await getValidateSessionUseCase().execute(token)).toBeNull();
    expect(await sessionRows()).toHaveLength(0);
  });

  it('keeps the other open sessions untouched', async () => {
    const mine = tokenFrom(await login(loginRequest({ username: 'ana', password: 'secreto-ana' })));
    const other = tokenFrom(await login(loginRequest({ username: 'ana', password: 'secreto-ana' })));

    await logout(logoutRequest(mine));

    expect(await getValidateSessionUseCase().execute(mine)).toBeNull();
    expect(await getValidateSessionUseCase().execute(other)).not.toBeNull();
  });

  it('succeeds even when nobody is logged in', async () => {
    const response = await logout(logoutRequest());

    expect(response.status).toBe(200);
  });
});
