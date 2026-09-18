import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { SALAS, Sala } from '@/domain/entities/presentation/enums';

/**
 * Stamps or clears a part's sala ('A' | 'B' | null).
 *
 * Clear is a valid write: sala = null MUST reach the repository so the
 * direct UPDATE writes NULL (the upsertWeek COALESCE guard cannot).
 */
export class SetPartSalaUseCase {
  constructor(private readonly assignmentsRepository: IAssignmentsRepository) {}

  async execute(input: { id_part: number; sala: Sala | null }): Promise<void> {
    const part = await this.assignmentsRepository.findPartById(input.id_part);
    if (!part) throw new NotFoundError(`Presentación ${input.id_part} no encontrada`);

    const isValidSala = input.sala === null || (SALAS as readonly string[]).includes(input.sala);
    if (!isValidSala) {
      throw new ValidationError(`Sala inválida: ${String(input.sala)} (valores válidos: A, B o null)`);
    }

    await this.assignmentsRepository.updatePartSala(input.id_part, input.sala);
  }
}
