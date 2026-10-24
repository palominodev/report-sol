import type { Account } from '@/core/domain/auth/Account';
import type { ISessionRepository } from '@/core/domain/auth/ISessionRepository';
import type { ISessionTokenService } from '@/core/domain/auth/ISessionTokenService';

export class ValidateSessionUseCase {
  constructor(
    private readonly sessions: ISessionRepository,
    private readonly tokens: ISessionTokenService,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** The account behind a live session, or null if there is none. */
  async execute(token: string | undefined): Promise<Account | null> {
    if (!token) return null;
    return this.sessions.findAccountByTokenHash(this.tokens.hash(token), this.now());
  }
}
