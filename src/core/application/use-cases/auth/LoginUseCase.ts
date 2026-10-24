import type { Account } from '@/core/domain/auth/Account';
import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { ISessionRepository } from '@/core/domain/auth/ISessionRepository';
import type { IPasswordHasher } from '@/core/domain/auth/IPasswordHasher';
import type { ISessionTokenService } from '@/core/domain/auth/ISessionTokenService';
import { AuthenticationError } from '@/core/domain/errors/AuthenticationError';

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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

    const found = await this.accounts.findWithHashByUsername(normalized);
    // A session is opened only when the account exists, is active AND the password matches.
    const passwordOk = found ? await this.hasher.verify(password, found.passwordHash) : false;
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
