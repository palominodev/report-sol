import type { Account } from '@/core/domain/auth/Account';
import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { ISessionRepository } from '@/core/domain/auth/ISessionRepository';
import type { IPasswordHasher } from '@/core/domain/auth/IPasswordHasher';
import type { ISessionTokenService } from '@/core/domain/auth/ISessionTokenService';
import { AuthenticationError } from '@/core/domain/errors/AuthenticationError';

import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from './password-policy';

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A real hash of a throwaway secret, used to spend the same time on an unknown username as on a
 * known one. Built once per hasher (the first unknown-user attempt pays for it) so later attempts
 * do exactly one verify, like a known user. It is never compared against a stored account.
 */
const standInHashes = new WeakMap<IPasswordHasher, Promise<string>>();

function standInHashFor(hasher: IPasswordHasher): Promise<string> {
  let promise = standInHashes.get(hasher);
  if (!promise) {
    promise = hasher.hash(`stand-in:${Math.random().toString(36)}:${Date.now()}`);
    standInHashes.set(hasher, promise);
  }
  return promise;
}

/** One message for every failure, so the screen never reveals which usernames exist. */
export const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos.';

export interface LoginResult {
  /** Raw token for the cookie. It is not stored anywhere; only its hash is. */
  token: string;
  account: Account;
  expiresAt: Date;
}

export class LoginUseCase {
  constructor(
    private readonly accounts: IAccountRepository,
    private readonly sessions: ISessionRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokens: ISessionTokenService,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(username: string, password: string): Promise<LoginResult> {
    const normalized = username.trim();
    if (!normalized || !password) throw new AuthenticationError(INVALID_CREDENTIALS_MESSAGE);
    // No real account can have input this long, so do not spend a lookup or a hash on it.
    if (normalized.length > MAX_USERNAME_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      throw new AuthenticationError(INVALID_CREDENTIALS_MESSAGE);
    }

    const found = await this.accounts.findWithHashByUsername(normalized);
    // Always one verify, even for an unknown user, so the response time does not reveal which
    // usernames exist. A session is opened only when the account exists, is active AND the
    // password matches: the stand-in result is discarded.
    const passwordOk = await this.hasher.verify(
      password,
      found ? found.passwordHash : await standInHashFor(this.hasher)
    );
    if (!found || !found.activa || !passwordOk) {
      throw new AuthenticationError(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = this.tokens.generate();
    const expiresAt = new Date(this.now().getTime() + SESSION_DURATION_MS);
    await this.sessions.create({
      tokenHash: this.tokens.hash(token),
      idCuenta: found.id,
      expiraEn: expiresAt,
    });

    const { passwordHash: _omit, ...account } = found;
    return { token, account, expiresAt };
  }
}
