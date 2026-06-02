import { IInformeRepository, InformeUpdateData } from '@/core/domain/repositories/IInformeRepository';
import { ValidationError } from '@/core/domain/errors/ValidationError';

export class UpdateInformeUseCase {
  constructor(private informeRepository: IInformeRepository) {}

  async execute(id: number, data: InformeUpdateData): Promise<void> {
    if (data.cursos === undefined || data.cursos === null || typeof data.cursos !== 'number' || data.cursos < 0) {
      throw new ValidationError('Los cursos son requeridos y deben ser un número válido');
    }

    if (data.horas !== null && (typeof data.horas !== 'number' || data.horas < 0)) {
      throw new ValidationError('Las horas deben ser un número válido o nulo');
    }

    if (data.participacion === undefined || data.participacion === null || typeof data.participacion !== 'boolean') {
      throw new ValidationError('La participación es requerida y debe ser un booleano');
    }

    if (data.trabajo_como_auxiliar === undefined || data.trabajo_como_auxiliar === null || typeof data.trabajo_como_auxiliar !== 'boolean') {
      throw new ValidationError('El campo trabajo como auxiliar es requerido y debe ser un booleano');
    }

    await this.informeRepository.update(id, data);
  }
}
