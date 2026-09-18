import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';

export class GetUltimoInformeUseCase {
  constructor(private readonly informeRepository: IInformeRepository) {}

  /**
   * Returns the service period (año, mes) of the most recently registered
   * informe, or null when no informes exist yet.
   */
  async execute(): Promise<{ año: number; mes: string } | null> {
    return this.informeRepository.findUltimo();
  }
}
