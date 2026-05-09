import { IUserRepository } from '@/core/domain/repositories/IUserRepository';

export class GetUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async executeWithDetails(grupoId?: number): Promise<Record<string, unknown>[]> {
    return this.userRepository.findAllWithDetails(grupoId);
  }
}
