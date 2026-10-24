import { InformeRow } from '@/core/domain/PublisherStats';
import { IInformeRepository, InformeCreateData } from '@/core/domain/repositories/IInformeRepository';
import { ValidationError } from '@/core/domain/errors/ValidationError';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** A month has at most 744 hours; nobody reports more. */
export const MAX_HORAS = 744;
export const MAX_CURSOS = 200;
export const MAX_NOTAS = 1000;

export class CreateInformeUseCase {
  constructor(
    private informeRepository: IInformeRepository,
    private now: () => Date = () => new Date()
  ) {}

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
    const mesIndex = MESES.indexOf(data.mes.toUpperCase());
    if (mesIndex === -1) {
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

    this.assertReasonable(data, mesIndex);

    // Force mes to upper case for consistency; missing optional fields are stored as null.
    const sanitizedData = {
      ...data,
      mes: data.mes.toUpperCase(),
      horas: data.horas ?? null,
      notas: data.notas ?? null,
    };

    return await this.informeRepository.create(sanitizedData);
  }

  /**
   * Anyone can send a report, so the values must be ones a real report can have. A year or a month
   * that does not exist yet would also become the dashboard's default period.
   */
  private assertReasonable(data: InformeCreateData, mesIndex: number): void {
    const now = this.now();
    const currentYear = now.getUTCFullYear();

    if (!Number.isInteger(data.id_usuario) || data.id_usuario <= 0) {
      throw new ValidationError('El publicador no es válido.');
    }
    if (!Number.isInteger(data.año) || data.año < currentYear - 1 || data.año > currentYear) {
      throw new ValidationError(`El año debe ser ${currentYear - 1} o ${currentYear}.`);
    }
    if (data.año === currentYear && mesIndex > now.getUTCMonth()) {
      throw new ValidationError('No se puede enviar el informe de un mes que todavía no llegó.');
    }
    if (data.horas !== undefined && data.horas !== null) {
      if (!Number.isFinite(data.horas) || data.horas < 0 || data.horas > MAX_HORAS) {
        throw new ValidationError(`Las horas deben estar entre 0 y ${MAX_HORAS}.`);
      }
    }
    if (!Number.isInteger(data.cursos) || data.cursos < 0 || data.cursos > MAX_CURSOS) {
      throw new ValidationError(`Los cursos deben ser un número entero entre 0 y ${MAX_CURSOS}.`);
    }
    if (data.notas !== undefined && data.notas !== null) {
      if (typeof data.notas !== 'string' || data.notas.length > MAX_NOTAS) {
        throw new ValidationError(`Las notas deben ser un texto de hasta ${MAX_NOTAS} caracteres.`);
      }
    }
  }
}
