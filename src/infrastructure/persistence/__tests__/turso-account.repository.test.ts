import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@libsql/client';
import { TursoAccountRepository } from '../turso-account.repository';
import { TursoSessionRepository } from '../turso-session.repository';
import { setDatabaseClient } from '../database.client';
import { ConflictError } from '@/core/domain/errors/ConflictError';

type DatabaseClient = ReturnType<typeof createClient>;

async function freshClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
  await client.execute(`
    CREATE TABLE cuenta (
      id_cuenta INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('administrador', 'normal')),
      activa INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0, 1)),
      creada_en TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await client.execute(`
    CREATE TABLE sesion (
      token_hash TEXT PRIMARY KEY,
      id_cuenta INTEGER NOT NULL,
      expira_en TEXT NOT NULL,
      creada_en TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (id_cuenta) REFERENCES cuenta(id_cuenta) ON DELETE CASCADE
    )
  `);
  setDatabaseClient(client);
  return client;
}

afterEach(() => setDatabaseClient(null));

describe('TursoAccountRepository', () => {
  it('creates an account that is active and returns it without the hash', async () => {
    await freshClient();
    const repo = new TursoAccountRepository();

    const account = await repo.create({ username: 'maria', passwordHash: 'h1', rol: 'normal' });

    expect(account).toEqual({ id: expect.any(Number), username: 'maria', rol: 'normal', activa: true });
    expect(account).not.toHaveProperty('passwordHash');
  });

  it('rejects a duplicate username regardless of letter case and keeps a single account', async () => {
    await freshClient();
    const repo = new TursoAccountRepository();
    await repo.create({ username: 'Maria', passwordHash: 'h1', rol: 'normal' });

    await expect(
      repo.create({ username: 'maria', passwordHash: 'h2', rol: 'administrador' })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(await repo.findAll()).toHaveLength(1);
  });

  it('finds an account with its hash by username, ignoring letter case', async () => {
    await freshClient();
    const repo = new TursoAccountRepository();
    await repo.create({ username: 'Maria', passwordHash: 'h1', rol: 'normal' });

    const found = await repo.findWithHashByUsername('MARIA');

    expect(found).toMatchObject({ username: 'Maria', passwordHash: 'h1', activa: true });
    expect(await repo.findWithHashByUsername('nadie')).toBeNull();
  });

  it('lists accounts without exposing any hash', async () => {
    await freshClient();
    const repo = new TursoAccountRepository();
    await repo.create({ username: 'ana', passwordHash: 'h1', rol: 'administrador' });
    await repo.create({ username: 'beto', passwordHash: 'h2', rol: 'normal' });

    const all = await repo.findAll();

    expect(all.map((a) => a.username)).toEqual(['ana', 'beto']);
    for (const a of all) expect(a).not.toHaveProperty('passwordHash');
  });

  it('deactivates and reactivates an account', async () => {
    await freshClient();
    const repo = new TursoAccountRepository();
    const { id } = await repo.create({ username: 'ana', passwordHash: 'h1', rol: 'normal' });

    await repo.setActive(id, false);
    expect((await repo.findById(id))?.activa).toBe(false);

    await repo.setActive(id, true);
    expect((await repo.findById(id))?.activa).toBe(true);
  });

  it('replaces the password hash', async () => {
    await freshClient();
    const repo = new TursoAccountRepository();
    const { id } = await repo.create({ username: 'ana', passwordHash: 'old', rol: 'normal' });

    await repo.setPasswordHash(id, 'new');

    expect((await repo.findWithHashByUsername('ana'))?.passwordHash).toBe('new');
  });

  it('counts only active administrators', async () => {
    await freshClient();
    const repo = new TursoAccountRepository();
    const admin = await repo.create({ username: 'ana', passwordHash: 'h', rol: 'administrador' });
    await repo.create({ username: 'beto', passwordHash: 'h', rol: 'administrador' });
    await repo.create({ username: 'carla', passwordHash: 'h', rol: 'normal' });
    expect(await repo.countActiveAdmins()).toBe(2);

    await repo.setActive(admin.id, false);
    expect(await repo.countActiveAdmins()).toBe(1);
  });
});

describe('TursoSessionRepository', () => {
  const now = new Date('2026-10-24T12:00:00.000Z');
  const later = new Date('2026-10-25T12:00:00.000Z');
  const earlier = new Date('2026-10-23T12:00:00.000Z');

  it('returns the owner of a valid session', async () => {
    await freshClient();
    const accounts = new TursoAccountRepository();
    const sessions = new TursoSessionRepository();
    const acc = await accounts.create({ username: 'ana', passwordHash: 'h', rol: 'normal' });

    await sessions.create({ tokenHash: 't1', idCuenta: acc.id, expiraEn: later });

    expect(await sessions.findAccountByTokenHash('t1', now)).toEqual(acc);
  });

  it('does not accept an unknown token', async () => {
    await freshClient();
    expect(await new TursoSessionRepository().findAccountByTokenHash('nope', now)).toBeNull();
  });

  it('does not accept an expired session', async () => {
    await freshClient();
    const accounts = new TursoAccountRepository();
    const sessions = new TursoSessionRepository();
    const acc = await accounts.create({ username: 'ana', passwordHash: 'h', rol: 'normal' });

    await sessions.create({ tokenHash: 't1', idCuenta: acc.id, expiraEn: earlier });

    expect(await sessions.findAccountByTokenHash('t1', now)).toBeNull();
  });

  it('stops accepting the session as soon as the account is deactivated', async () => {
    await freshClient();
    const accounts = new TursoAccountRepository();
    const sessions = new TursoSessionRepository();
    const acc = await accounts.create({ username: 'ana', passwordHash: 'h', rol: 'normal' });
    await sessions.create({ tokenHash: 't1', idCuenta: acc.id, expiraEn: later });

    await accounts.setActive(acc.id, false);

    expect(await sessions.findAccountByTokenHash('t1', now)).toBeNull();
  });

  it('closes a single session on logout and leaves the others open', async () => {
    await freshClient();
    const accounts = new TursoAccountRepository();
    const sessions = new TursoSessionRepository();
    const acc = await accounts.create({ username: 'ana', passwordHash: 'h', rol: 'normal' });
    await sessions.create({ tokenHash: 't1', idCuenta: acc.id, expiraEn: later });
    await sessions.create({ tokenHash: 't2', idCuenta: acc.id, expiraEn: later });

    await sessions.deleteByTokenHash('t1');

    expect(await sessions.findAccountByTokenHash('t1', now)).toBeNull();
    expect(await sessions.findAccountByTokenHash('t2', now)).not.toBeNull();
  });

  it('closes every session of an account (used on password reset)', async () => {
    await freshClient();
    const accounts = new TursoAccountRepository();
    const sessions = new TursoSessionRepository();
    const ana = await accounts.create({ username: 'ana', passwordHash: 'h', rol: 'normal' });
    const beto = await accounts.create({ username: 'beto', passwordHash: 'h', rol: 'normal' });
    await sessions.create({ tokenHash: 't1', idCuenta: ana.id, expiraEn: later });
    await sessions.create({ tokenHash: 't2', idCuenta: ana.id, expiraEn: later });
    await sessions.create({ tokenHash: 't3', idCuenta: beto.id, expiraEn: later });

    await sessions.deleteByAccount(ana.id);

    expect(await sessions.findAccountByTokenHash('t1', now)).toBeNull();
    expect(await sessions.findAccountByTokenHash('t2', now)).toBeNull();
    expect(await sessions.findAccountByTokenHash('t3', now)).not.toBeNull();
  });
});
