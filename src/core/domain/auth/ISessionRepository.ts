import type { Account } from './Account';

export interface NewSession {
  /** Hash of the cookie token; the raw token is never stored. */
  tokenHash: string;
  idCuenta: number;
  expiraEn: Date;
}

export interface ISessionRepository {
  create(session: NewSession): Promise<void>;
  /** Owner of a live session; null if unknown, expired, or the account is deactivated. */
  findAccountByTokenHash(tokenHash: string, now: Date): Promise<Account | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteByAccount(idCuenta: number): Promise<void>;
}
