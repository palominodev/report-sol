import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';

export class ReactivateAccountUseCase {
  constructor(private readonly accounts: IAccountRepository) {}

  /** The previous password still applies; resetting it is a separate, explicit action. */
  async execute(id: number): Promise<void> {
    const account = await this.accounts.findById(id);
    if (!account) throw new NotFoundError('No existe esa cuenta.');
    await this.accounts.setActive(id, true);
  }
}
