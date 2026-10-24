import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { TursoAccountRepository } from '@/infrastructure/persistence/turso-account.repository';
import { TursoSessionRepository } from '@/infrastructure/persistence/turso-session.repository';
import { CryptoSessionTokenService } from '@/infrastructure/auth/crypto-session-token-service';
import { getValidateSessionUseCase } from '@/infrastructure/config/di';
import { signIn } from '../../__tests__/auth-helpers';
import { GET, POST } from '../route';
import { PATCH } from '../[id]/route';

let client: ReturnType<typeof createClient>;

// Next always passes the route context; these routes have no params.
const list = (request: NextRequest) => GET(request, undefined);
const create = (request: NextRequest) => POST(request, undefined);

const VALID_PASSWORD = 'una-clave-larga-123';

function json(method: string, body: unknown, cookie?: string, url = 'http://localhost/api/cuentas') {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function get(cookie?: string) {
  return new NextRequest('http://localhost/api/cuentas', { headers: cookie ? { cookie } : {} });
}

function patch(id: string, body: unknown, cookie?: string) {
  return PATCH(json('PATCH', body, cookie, `http://localhost/api/cuentas/${id}`), {
    params: Promise.resolve({ id }),
  });
}

async function rows(sql: string) {
  return (await client.execute(sql)).rows;
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('src/db.sql', 'utf8'));
  setDatabaseClient(client);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  setDatabaseClient(null);
  vi.restoreAllMocks();
});

describe('GET /api/cuentas', () => {
  it('lists the accounts for an administrator, never exposing a hash', async () => {
    const admin = await signIn('ana', 'administrador');
    await new TursoAccountRepository().create({ username: 'beto', passwordHash: 'secret-hash', rol: 'normal' });

    const response = await list(get(admin.cookie));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cuentas.map((c: { username: string }) => c.username)).toEqual(['ana', 'beto']);
    expect(JSON.stringify(body)).not.toMatch(/hash|secret-hash|not-used/i);
  });

  it('refuses a normal account with 403', async () => {
    const normal = await signIn('beto', 'normal');

    const response = await list(get(normal.cookie));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'No tenés permiso para hacer esto.' });
  });

  it('refuses a visitor without a session with 401', async () => {
    expect((await list(get())).status).toBe(401);
  });
});

describe('POST /api/cuentas', () => {
  it('creates an active account: 201, no hash in the answer, password stored only as a scrypt hash', async () => {
    const admin = await signIn('ana', 'administrador');

    const response = await create(json('POST', { username: 'maria', password: VALID_PASSWORD, rol: 'normal' }, admin.cookie));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.cuenta).toEqual({ id: expect.any(Number), username: 'maria', rol: 'normal', activa: true });
    expect(JSON.stringify(body)).not.toContain(VALID_PASSWORD);

    const [stored] = await rows("SELECT password_hash FROM cuenta WHERE username = 'maria'");
    expect(String(stored.password_hash)).toMatch(/^scrypt\$/);
    expect(String(stored.password_hash)).not.toContain(VALID_PASSWORD);
  });

  it('lets the new account sign in right away with that password', async () => {
    const admin = await signIn('ana', 'administrador');
    await create(json('POST', { username: 'maria', password: VALID_PASSWORD, rol: 'normal' }, admin.cookie));

    const { POST: login } = await import('../../auth/login/route');
    const response = await login(json('POST', { username: 'maria', password: VALID_PASSWORD }, undefined, 'http://localhost/api/auth/login'));

    expect(response.status).toBe(200);
  });

  it('refuses a normal account with 403 and creates nothing', async () => {
    const normal = await signIn('beto', 'normal');

    const response = await create(json('POST', { username: 'intruso', password: VALID_PASSWORD, rol: 'administrador' }, normal.cookie));

    expect(response.status).toBe(403);
    expect(await rows('SELECT username FROM cuenta')).toHaveLength(1);
  });

  it('refuses a visitor without a session with 401 and creates nothing', async () => {
    const response = await create(json('POST', { username: 'intruso', password: VALID_PASSWORD, rol: 'administrador' }));

    expect(response.status).toBe(401);
    expect(await rows('SELECT username FROM cuenta')).toHaveLength(0);
  });

  it.each([
    ['a too short password', { username: 'maria', password: '123456789', rol: 'normal' }, 'La contraseña debe tener al menos 10 caracteres.'],
    ['an invalid username', { username: 'ma', password: VALID_PASSWORD, rol: 'normal' }, null],
    ['an unknown role', { username: 'maria', password: VALID_PASSWORD, rol: 'superuser' }, 'El tipo de cuenta no es válido.'],
  ])('answers 400 for %s and creates nothing', async (_label, body, message) => {
    const admin = await signIn('ana', 'administrador');

    const response = await create(json('POST', body, admin.cookie));

    expect(response.status).toBe(400);
    if (message) expect(await response.json()).toEqual({ error: message });
    expect(await rows('SELECT username FROM cuenta')).toHaveLength(1);
  });

  it('answers 400 for a body that is not JSON or has non-text fields, and creates nothing', async () => {
    const admin = await signIn('ana', 'administrador');

    expect((await create(json('POST', '{not json', admin.cookie))).status).toBe(400);
    expect((await create(json('POST', { username: 7, password: ['x'], rol: {} }, admin.cookie))).status).toBe(400);
    expect(await rows('SELECT username FROM cuenta')).toHaveLength(1);
  });

  it('answers 409 for a duplicate username in any letter case, keeping the original untouched', async () => {
    const admin = await signIn('ana', 'administrador');
    await create(json('POST', { username: 'Maria', password: VALID_PASSWORD, rol: 'normal' }, admin.cookie));
    const [before] = await rows("SELECT password_hash FROM cuenta WHERE username = 'Maria'");

    const response = await create(json('POST', { username: 'maria', password: 'otra-clave-larga', rol: 'administrador' }, admin.cookie));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Ya existe una cuenta con ese usuario.' });
    expect(await rows('SELECT username FROM cuenta')).toHaveLength(2);
    expect((await rows("SELECT password_hash FROM cuenta WHERE username = 'Maria'"))[0]).toEqual(before);
  });
});

describe('PATCH /api/cuentas/[id]', () => {
  async function targetWithSession() {
    const accounts = new TursoAccountRepository();
    const target = await accounts.create({ username: 'beto', passwordHash: 'h', rol: 'normal' });
    const tokens = new CryptoSessionTokenService();
    const token = tokens.generate();
    await new TursoSessionRepository().create({
      tokenHash: tokens.hash(token),
      idCuenta: target.id,
      expiraEn: new Date(Date.now() + 60_000),
    });
    return { target, token };
  }

  it('deactivates an account and its open session stops working at once', async () => {
    const admin = await signIn('ana', 'administrador');
    const { target, token } = await targetWithSession();
    expect(await getValidateSessionUseCase().execute(token)).not.toBeNull();

    const response = await patch(String(target.id), { activa: false }, admin.cookie);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cuenta: { ...target, activa: false } });
    expect(await getValidateSessionUseCase().execute(token)).toBeNull();
    expect(await rows(`SELECT 1 FROM sesion WHERE id_cuenta = ${target.id}`)).toHaveLength(0);
  });

  it('reactivates a deactivated account', async () => {
    const admin = await signIn('ana', 'administrador');
    const { target } = await targetWithSession();
    await patch(String(target.id), { activa: false }, admin.cookie);

    const response = await patch(String(target.id), { activa: true }, admin.cookie);

    expect(response.status).toBe(200);
    expect((await response.json()).cuenta.activa).toBe(true);
  });

  it('refuses to deactivate the last active administrator: 422, nothing changes, the session survives', async () => {
    const admin = await signIn('ana', 'administrador');

    const response = await patch(String(admin.accountId), { activa: false }, admin.cookie);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'No se puede desactivar al último administrador activo: nadie podría administrar las cuentas.',
    });
    expect((await rows(`SELECT activa FROM cuenta WHERE id_cuenta = ${admin.accountId}`))[0].activa).toBe(1);
    expect(await getValidateSessionUseCase().execute(admin.token)).not.toBeNull();
  });

  it('refuses a normal account with 403 and changes nothing', async () => {
    const normal = await signIn('carla', 'normal');
    const { target } = await targetWithSession();

    const response = await patch(String(target.id), { activa: false }, normal.cookie);

    expect(response.status).toBe(403);
    expect((await rows(`SELECT activa FROM cuenta WHERE id_cuenta = ${target.id}`))[0].activa).toBe(1);
  });

  it('refuses a visitor without a session with 401', async () => {
    const { target } = await targetWithSession();

    expect((await patch(String(target.id), { activa: false })).status).toBe(401);
    expect((await rows(`SELECT activa FROM cuenta WHERE id_cuenta = ${target.id}`))[0].activa).toBe(1);
  });

  it('answers 404 for an unknown account', async () => {
    const admin = await signIn('ana', 'administrador');

    const response = await patch('999', { activa: false }, admin.cookie);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'No existe esa cuenta.' });
  });

  it.each([['abc'], ['1.5'], ['-1'], ['0'], ['1e3']])('answers 400 for the invalid id %s', async (id) => {
    const admin = await signIn('ana', 'administrador');

    expect((await patch(id, { activa: false }, admin.cookie)).status).toBe(400);
  });

  it.each([[{}], [{ activa: 'false' }], [{ activa: 0 }], [{ activa: null }]])(
    'answers 400 and changes nothing for the body %j',
    async (body) => {
      const admin = await signIn('ana', 'administrador');
      const { target } = await targetWithSession();

      expect((await patch(String(target.id), body, admin.cookie)).status).toBe(400);
      expect((await rows(`SELECT activa FROM cuenta WHERE id_cuenta = ${target.id}`))[0].activa).toBe(1);
    }
  );

  it('answers 400 for a body that is not JSON', async () => {
    const admin = await signIn('ana', 'administrador');
    const { target } = await targetWithSession();

    expect((await patch(String(target.id), '{not json', admin.cookie)).status).toBe(400);
  });
});
