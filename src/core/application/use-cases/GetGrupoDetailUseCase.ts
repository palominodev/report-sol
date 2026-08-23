import { IGrupoRepository, GrupoMemberReportStatus } from '@/core/domain/repositories/IGrupoRepository';

export interface GrupoDetail {
  nombreGrupo: string;
  integrantes: GrupoMemberReportStatus[];
}

export class GetGrupoDetailUseCase {
  constructor(private readonly grupoRepository: IGrupoRepository) {}

  async execute(idGrupo: number, mes: string, año: number): Promise<GrupoDetail> {
    const [nombreGrupo, integrantes] = await Promise.all([
      this.grupoRepository.findNombreById(idGrupo),
      this.grupoRepository.findMembersWithReportStatus(idGrupo, mes, año),
    ]);

    return { nombreGrupo: nombreGrupo ?? '', integrantes };
  }
}
