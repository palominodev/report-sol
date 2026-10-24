import type { Account, AccountWithHash, NewAccount } from './Account';

export interface IAccountRepository {
  /** @throws ConflictError when the username is already taken (case-insensitive). */
  create(account: NewAccount): Promise<Account>;
  findAll(): Promise<Account[]>;
  findById(id: number): Promise<Account | null>;
  findWithHashByUsername(username: string): Promise<AccountWithHash | null>;
  setActive(id: number, active: boolean): Promise<void>;
  /**
   * Deactivates the account unless it is the last active administrator, checking and writing
   * atomically so simultaneous requests cannot leave the system without administrators.
   * Returns false (and changes nothing) when it was refused for that reason.
   * The account must exist: an unknown id also returns false.
   */
  deactivateUnlessLastAdmin(id: number): Promise<boolean>;
  setPasswordHash(id: number, passwordHash: string): Promise<void>;
  countActiveAdmins(): Promise<number>;
}
