import { getDatabaseClient } from './database.client';
import type { ISessionRepository, NewSession } from '@/core/domain/auth/ISessionRepository';
import type { Account } from '@/core/domain/auth/Account';
import { toAccount } from './turso-account.repository';

export class TursoSessionRepository implements ISessionRepository {
  async create(session: NewSession): Promise<void> {
    await getDatabaseClient().execute({
      sql: 'INSERT INTO sesion (token_hash, id_cuenta, expira_en) VALUES (?, ?, ?)',
      args: [session.tokenHash, session.idCuenta, session.expiraEn.toISOString()],
    });
  }

  async findAccountByTokenHash(tokenHash: string, now: Date): Promise<Account | null> {
    // ISO-8601 UTC strings sort chronologically, so a text comparison is exact.
    const result = await getDatabaseClient().execute({
      sql: `SELECT c.id_cuenta, c.username, c.rol, c.activa
            FROM sesion s
            JOIN cuenta c ON c.id_cuenta = s.id_cuenta
            WHERE s.token_hash = ? AND s.expira_en > ? AND c.activa = 1`,
      args: [tokenHash, now.toISOString()],
    });
    return result.rows[0] ? toAccount(result.rows[0] as Record<string, unknown>) : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await getDatabaseClient().execute({
      sql: 'DELETE FROM sesion WHERE token_hash = ?',
      args: [tokenHash],
    });
  }

  async deleteByAccount(idCuenta: number): Promise<void> {
    await getDatabaseClient().execute({
      sql: 'DELETE FROM sesion WHERE id_cuenta = ?',
      args: [idCuenta],
    });
  }
}
