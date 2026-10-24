import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { ISessionRepository } from '@/core/domain/auth/ISessionRepository';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { UnprocessableError } from '@/core/domain/errors/UnprocessableError';

export class DeactivateAccountUseCase {
  constructor(
    private readonly accounts: IAccountRepository,
    private readonly sessions: ISessionRepository
  ) {}

  /**
   * Cuts the account's access at once: deactivates it and closes every open session.
   * The last active administrator can never be deactivated, otherwise nobody could manage accounts.
   */
  async execute(id: number): Promise<void> {
    const account = await this.accounts.findById(id);
    if (!account) throw new NotFoundError('No existe esa cuenta.');

    if (account.activa && account.rol === 'administrador' && (await this.accounts.countActiveAdmins()) <= 1) {
      throw new UnprocessableError(
        'No se puede desactivar al último administrador activo: nadie podría administrar las cuentas.'
      );
    }

    await this.accounts.setActive(id, false);
    await this.sessions.deleteByAccount(id);
  }
}
