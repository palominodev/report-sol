import type { Account, AccountWithHash, NewAccount } from './Account';

export interface IAccountRepository {
  /** @throws ConflictError when the username is already taken (case-insensitive). */
  create(account: NewAccount): Promise<Account>;
  findAll(): Promise<Account[]>;
  findById(id: number): Promise<Account | null>;
  findWithHashByUsername(username: string): Promise<AccountWithHash | null>;
  setActive(id: number, active: boolean): Promise<void>;
  setPasswordHash(id: number, passwordHash: string): Promise<void>;
  countActiveAdmins(): Promise<number>;
}
