import { IInformeRepository, InformeCreateData } from '@/core/domain/repositories/IInformeRepository';

export class CreateInformeUseCase {
  constructor(private informeRepository: IInformeRepository) {}

  async execute(data: InformeCreateData): Promise<void> {
    if (!data.mes || !data.año) {
      throw new Error('Mes y año son requeridos para crear un informe.');
    }
    if (!data.id_usuario) {
      throw new Error('ID de usuario es requerido para crear un informe.');
    }

    // The validation for duplication is handled in the repository, 
    // but the use case delegates the actual creation logic.
    await this.informeRepository.create(data);
  }
}
