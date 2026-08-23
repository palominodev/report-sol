import { GetGrupoDetailUseCase, GrupoDetail } from '@/core/application/use-cases/GetGrupoDetailUseCase';
import { getGrupoRepository } from '@/infrastructure/config/di';

export async function getGrupoDetail(idGrupo: number, mes: string, año: number): Promise<GrupoDetail> {
  const grupoRepository = getGrupoRepository();
  const getGrupoDetailUseCase = new GetGrupoDetailUseCase(grupoRepository);
  return getGrupoDetailUseCase.execute(idGrupo, mes, año);
}
