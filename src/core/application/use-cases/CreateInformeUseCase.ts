import { InformeRow } from '@/core/domain/PublisherStats';
import { IInformeRepository, InformeCreateData } from '@/core/domain/repositories/IInformeRepository';
import { ValidationError } from '@/core/domain/errors/ValidationError';

export class CreateInformeUseCase {
  constructor(private informeRepository: IInformeRepository) {}

  async execute(data: InformeCreateData): Promise<InformeRow> {
    if (data.cursos === undefined || data.cursos === null || typeof data.cursos !== 'number') {
      throw new ValidationError('El campo "cursos" es requerido y debe ser un número.');
    }
    if (data.año === undefined || data.año === null || typeof data.año !== 'number') {
      throw new ValidationError('El campo "año" es requerido y debe ser un número.');
    }
    if (!data.mes || typeof data.mes !== 'string') {
      throw new ValidationError('El campo "mes" es requerido y debe ser un texto.');
    }
    const mesesValidos = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    if (!mesesValidos.includes(data.mes.toUpperCase())) {
      throw new ValidationError('El campo "mes" debe ser una abreviación de mes válida (e.g. "ENE").');
    }
    if (data.participacion === undefined || data.participacion === null || typeof data.participacion !== 'boolean') {
      throw new ValidationError('El campo "participacion" es requerido y debe ser un booleano.');
    }
    if (!data.id_usuario || typeof data.id_usuario !== 'number') {
      throw new ValidationError('El campo "id_usuario" es requerido y debe ser un número.');
    }
    if (data.horas !== undefined && data.horas !== null && typeof data.horas !== 'number') {
      throw new ValidationError('El campo "horas" debe ser un número o nulo.');
    }

    // Force mes to upper case for consistency
    const sanitizedData = {
      ...data,
      mes: data.mes.toUpperCase(),
    };

    return await this.informeRepository.create(sanitizedData);
  }
}
