import type { ISessionRepository } from '@/core/domain/auth/ISessionRepository';
import type { ISessionTokenService } from '@/core/domain/auth/ISessionTokenService';

export class LogoutUseCase {
  constructor(
    private readonly sessions: ISessionRepository,
    private readonly tokens: ISessionTokenService
  ) {}

  /** Idempotent: closing a missing or unknown session is not an error. */
  async execute(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.sessions.deleteByTokenHash(this.tokens.hash(token));
  }
}
