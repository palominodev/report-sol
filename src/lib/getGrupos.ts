import { GetGruposUseCase } from '@/core/application/use-cases/GetGruposUseCase';
import { getGrupoRepository } from '@/infrastructure/config/di';

export async function getGrupos() {
  const grupoRepository = getGrupoRepository();
  const getGruposUseCase = new GetGruposUseCase(grupoRepository);
  return getGruposUseCase.executeWithDetails();
}
