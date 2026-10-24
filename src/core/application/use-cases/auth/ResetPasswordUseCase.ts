import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { ISessionRepository } from '@/core/domain/auth/ISessionRepository';
import type { IPasswordHasher } from '@/core/domain/auth/IPasswordHasher';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { assertValidPassword } from './password-policy';

export interface ResetPasswordInput {
  username: string;
  newPassword: string;
}

export class ResetPasswordUseCase {
  constructor(
    private readonly accounts: IAccountRepository,
    private readonly sessions: ISessionRepository,
    private readonly hasher: IPasswordHasher
  ) {}

  /**
   * Replaces the password and signs the account out everywhere: whoever held the old
   * password (or a stolen session) must not keep access.
   */
  async execute(input: ResetPasswordInput): Promise<void> {
    assertValidPassword(input.newPassword);

    const account = await this.accounts.findWithHashByUsername(input.username.trim());
    if (!account) throw new NotFoundError('No existe una cuenta con ese usuario.');

    await this.accounts.setPasswordHash(account.id, await this.hasher.hash(input.newPassword));
    await this.sessions.deleteByAccount(account.id);
  }
}
