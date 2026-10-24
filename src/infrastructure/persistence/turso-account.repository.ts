import { getDatabaseClient } from './database.client';
import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { Account, AccountRole, AccountWithHash, NewAccount } from '@/core/domain/auth/Account';
import { ConflictError } from '@/core/domain/errors/ConflictError';

type Row = Record<string, unknown>;

export function toAccount(row: Row): Account {
  return {
    id: Number(row.id_cuenta),
    username: String(row.username),
    rol: row.rol as AccountRole,
    activa: Number(row.activa) === 1,
  };
}

const COLUMNS = 'id_cuenta, username, rol, activa';

export class TursoAccountRepository implements IAccountRepository {
  async create(account: NewAccount): Promise<Account> {
    const client = getDatabaseClient();
    try {
      const result = await client.execute({
        sql: `INSERT INTO cuenta (username, password_hash, rol) VALUES (?, ?, ?)
              RETURNING ${COLUMNS}`,
        args: [account.username, account.passwordHash, account.rol],
      });
      return toAccount(result.rows[0] as Row);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new ConflictError('Ya existe una cuenta con ese usuario.');
      }
      throw error;
    }
  }

  async findAll(): Promise<Account[]> {
    const result = await getDatabaseClient().execute({
      sql: `SELECT ${COLUMNS} FROM cuenta ORDER BY id_cuenta`,
      args: [],
    });
    return result.rows.map((row) => toAccount(row as Row));
  }

  async findById(id: number): Promise<Account | null> {
    const result = await getDatabaseClient().execute({
      sql: `SELECT ${COLUMNS} FROM cuenta WHERE id_cuenta = ?`,
      args: [id],
    });
    return result.rows[0] ? toAccount(result.rows[0] as Row) : null;
  }

  async findWithHashByUsername(username: string): Promise<AccountWithHash | null> {
    const result = await getDatabaseClient().execute({
      sql: `SELECT ${COLUMNS}, password_hash FROM cuenta WHERE username = ?`,
      args: [username],
    });
    const row = result.rows[0] as Row | undefined;
    if (!row) return null;
    return { ...toAccount(row), passwordHash: String(row.password_hash) };
  }

  async setActive(id: number, active: boolean): Promise<void> {
    await getDatabaseClient().execute({
      sql: 'UPDATE cuenta SET activa = ? WHERE id_cuenta = ?',
      args: [active ? 1 : 0, id],
    });
  }

  async setPasswordHash(id: number, passwordHash: string): Promise<void> {
    await getDatabaseClient().execute({
      sql: 'UPDATE cuenta SET password_hash = ? WHERE id_cuenta = ?',
      args: [passwordHash, id],
    });
  }

  async countActiveAdmins(): Promise<number> {
    const result = await getDatabaseClient().execute({
      sql: "SELECT COUNT(*) AS total FROM cuenta WHERE rol = 'administrador' AND activa = 1",
      args: [],
    });
    return Number((result.rows[0] as Row).total);
  }
}
