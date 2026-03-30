import { IInformeRepository, InformeUpdateData } from '@/core/domain/repositories/IInformeRepository';

export class UpdateInformeUseCase {
  constructor(private informeRepository: IInformeRepository) {}

  async execute(id: number, data: InformeUpdateData): Promise<void> {
    if (data.cursos === undefined || data.cursos < 0) {
      throw new Error('Los cursos deben ser un número válido');
    }

    if (data.horas !== null && data.horas < 0) {
      throw new Error('Las horas deben ser un número válido');
    }

    await this.informeRepository.update(id, data);
  }
}
