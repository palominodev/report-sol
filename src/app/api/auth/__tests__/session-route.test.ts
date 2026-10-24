import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { TursoAccountRepository } from '@/infrastructure/persistence/turso-account.repository';
import { TursoSessionRepository } from '@/infrastructure/persistence/turso-session.repository';
import { signIn } from '../../__tests__/auth-helpers';
import { GET as session } from '../session/route';

let client: ReturnType<typeof createClient>;

function sessionRequest(cookie?: string) {
  return new NextRequest('http://localhost/api/auth/session', {
    headers: cookie ? { cookie } : {},
  });
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

describe('GET /api/auth/session', () => {
  it('tells a live session who is signed in, without any hash, and is never cached', async () => {
    const { cookie } = await signIn('ana', 'administrador');

    const response = await session(sessionRequest(cookie), {});

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      account: { id: 1, username: 'ana', rol: 'administrador', activa: true },
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('answers 401 when the request carries no session cookie', async () => {
    const response = await session(sessionRequest(), {});

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Necesitás iniciar sesión.' });
  });

  it('answers 401 for a token that matches no session', async () => {
    const response = await session(sessionRequest('report_sol_session=nope'), {});

    expect(response.status).toBe(401);
  });

  it('answers 401 once the session was closed', async () => {
    const { cookie, token } = await signIn('ana');
    const { CryptoSessionTokenService } = await import('@/infrastructure/auth/crypto-session-token-service');
    await new TursoSessionRepository().deleteByTokenHash(new CryptoSessionTokenService().hash(token));

    expect((await session(sessionRequest(cookie), {})).status).toBe(401);
  });

  it('answers 401 for a deactivated account even with a live session', async () => {
    const { cookie, accountId } = await signIn('ana');
    await new TursoAccountRepository().setActive(accountId, false);

    expect((await session(sessionRequest(cookie), {})).status).toBe(401);
  });
});
