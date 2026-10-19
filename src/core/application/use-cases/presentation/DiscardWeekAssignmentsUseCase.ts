import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ValidationError } from '@/core/domain/errors/ValidationError';

export class DiscardWeekAssignmentsUseCase {
  constructor(private readonly assignmentsRepository: IAssignmentsRepository) {}

  async execute(input: { id_week: number }): Promise<{ discarded: number }> {
    if (!Number.isSafeInteger(input.id_week) || input.id_week <= 0) {
      throw new ValidationError('Semana inválida');
    }
    const week = await this.assignmentsRepository.findWeekById(input.id_week);
    if (!week) throw new NotFoundError(`Semana ${input.id_week} no encontrada`);
    const discarded = await this.assignmentsRepository.discardWeek(input.id_week);
    return { discarded };
  }
}
