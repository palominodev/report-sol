import { GetGruposUseCase } from '@/core/application/use-cases/GetGruposUseCase';
import { TursoGrupoRepository } from '@/infrastructure/persistence/turso-grupo.repository';

export async function getGrupos() {
  const grupoRepository = new TursoGrupoRepository();
  const getGruposUseCase = new GetGruposUseCase(grupoRepository);
  return getGruposUseCase.executeWithDetails();
}
