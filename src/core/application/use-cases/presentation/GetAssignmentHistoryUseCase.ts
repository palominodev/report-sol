import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { AssignmentHistoryEntry, AssignmentHistoryDetail } from '@/core/domain/presentations/AssignmentHistory';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ValidationError } from '@/core/domain/errors/ValidationError';

export class GetAssignmentHistoryUseCase {
  constructor(private readonly assignmentsRepository: IAssignmentsRepository) {}

  private async referenceWeek(idWeek: number) {
    if (!Number.isSafeInteger(idWeek) || idWeek <= 0) throw new ValidationError('Semana inválida');
    const week = await this.assignmentsRepository.findWeekById(idWeek);
    if (!week) throw new NotFoundError(`Semana ${idWeek} no encontrada`);
    return week;
  }

  async execute(input: { id_week: number }): Promise<AssignmentHistoryEntry[]> {
    const week = await this.referenceWeek(input.id_week);
    return this.assignmentsRepository.findAssignmentHistoryBefore(week.fecha_inicio);
  }

  async getDetail(input: { id_week: number; id_asignacion: number }): Promise<AssignmentHistoryDetail> {
    const week = await this.referenceWeek(input.id_week);
    if (!Number.isSafeInteger(input.id_asignacion) || input.id_asignacion <= 0) {
      throw new ValidationError('Asignación inválida');
    }
    const detail = await this.assignmentsRepository.findAssignmentHistoryDetail(input.id_asignacion, week.fecha_inicio);
    if (!detail) throw new NotFoundError('Asignación histórica no encontrada');
    return detail;
  }
}
