import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeactivateAccountUseCase } from '@/core/application/use-cases/auth/DeactivateAccountUseCase';
import { UnprocessableError } from '@/core/domain/errors/UnprocessableError';
import { setDatabaseClient } from '../database.client';
import { TursoAccountRepository } from '../turso-account.repository';
import { TursoSessionRepository } from '../turso-session.repository';

let accounts: TursoAccountRepository;
let deactivate: DeactivateAccountUseCase;

beforeEach(async () => {
  const client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('src/db.sql', 'utf8'));
  setDatabaseClient(client);
  accounts = new TursoAccountRepository();
  deactivate = new DeactivateAccountUseCase(accounts, new TursoSessionRepository());
});

afterEach(() => setDatabaseClient(null));

async function admin(username: string) {
  return accounts.create({ username, passwordHash: 'h', rol: 'administrador' });
}

describe('the last active administrator survives simultaneous requests', () => {
  it('two administrators deactivating each other at the same moment: exactly one is refused', async () => {
    const ana = await admin('ana');
    const carla = await admin('carla');

    const results = await Promise.allSettled([deactivate.execute(ana.id), deactivate.execute(carla.id)]);

    expect(await accounts.countActiveAdmins()).toBe(1);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(refused).toHaveLength(1);
    expect(refused[0].reason).toBeInstanceOf(UnprocessableError);
  });

  it('three administrators and three simultaneous deactivations: one always stays active', async () => {
    const ids = [(await admin('ana')).id, (await admin('carla')).id, (await admin('dora')).id];

    const results = await Promise.allSettled(ids.map((id) => deactivate.execute(id)));

    expect(await accounts.countActiveAdmins()).toBe(1);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
  });

  it('the same administrator deactivated twice at once is harmless and keeps the other one', async () => {
    const ana = await admin('ana');
    await admin('carla');

    await Promise.allSettled([deactivate.execute(ana.id), deactivate.execute(ana.id)]);

    expect(await accounts.countActiveAdmins()).toBe(1);
  });

  it('a normal account is deactivated even when no administrator is left to protect', async () => {
    const beto = await accounts.create({ username: 'beto', passwordHash: 'h', rol: 'normal' });
    await admin('ana');

    await deactivate.execute(beto.id);

    expect((await accounts.findById(beto.id))?.activa).toBe(false);
    expect(await accounts.countActiveAdmins()).toBe(1);
  });
});
