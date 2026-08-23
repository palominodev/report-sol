import { GetUsersUseCase } from '@/core/application/use-cases/GetUsersUseCase';
import { UserDetails } from '@/core/domain/repositories/IUserRepository';
import { getUserRepository } from '@/infrastructure/config/di';

export async function getUsuarioDetails(id: number): Promise<UserDetails | null> {
  const userRepository = getUserRepository();
  const getUsersUseCase = new GetUsersUseCase(userRepository);
  return getUsersUseCase.executeWithDetailsById(id);
}
