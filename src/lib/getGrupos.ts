import { GetGruposUseCase } from '@/core/application/use-cases/GetGruposUseCase';
import { getGrupoRepository } from '@/infrastructure/config/di';

export async function getGrupos() {
  const grupoRepository = getGrupoRepository();
  const getGruposUseCase = new GetGruposUseCase(grupoRepository);
  return getGruposUseCase.executeWithDetails();
}

export async function getGruposSummary(): Promise<{ id_grupo: number; nombre: string }[]> {
  const grupoRepository = getGrupoRepository();
  const getGruposUseCase = new GetGruposUseCase(grupoRepository);
  const grupos = await getGruposUseCase.executeWithDetails();
  return grupos.map((grupo) => ({
    id_grupo: grupo.id_grupo,
    nombre: grupo.nombre_grupo,
  }));
}
