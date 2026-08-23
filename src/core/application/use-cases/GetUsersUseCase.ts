import { IUserRepository, UserDetails } from '@/core/domain/repositories/IUserRepository';

export class GetUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async executeWithDetails(grupoId?: number): Promise<Record<string, unknown>[]> {
    return this.userRepository.findAllWithDetails(grupoId);
  }

  async executeWithDetailsById(id: number): Promise<UserDetails | null> {
    return this.userRepository.findByIdWithDetails(id);
  }
}
