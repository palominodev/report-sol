import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';
import { ExportableInformeRow } from '@/core/domain/PublisherStats';

export interface GetInformesInput {
  año: number | null;
  mes: string | null;
  rol: string | null;
  grupo: number | null;
}

export class GetInformesUseCase {
  constructor(private readonly informeRepository: IInformeRepository) {}

  async execute(input: GetInformesInput): Promise<ExportableInformeRow[]> {
    return this.informeRepository.findAllWithUsersFilter(
      input.año,
      input.mes,
      input.rol,
      input.grupo
    );
  }
}
