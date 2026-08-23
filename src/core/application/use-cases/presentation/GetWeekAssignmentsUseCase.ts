import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { Assignment } from '@/domain/entities/presentation/Assignment';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';

export interface GetWeekAssignmentsResult {
  week: MeetingWeek;
  parts: PresentationPart[];
  assignments: Assignment[];
}

export class GetWeekAssignmentsUseCase {
  constructor(private readonly assignmentsRepository: IAssignmentsRepository) {}

  async execute(input: { id_week: number }): Promise<GetWeekAssignmentsResult> {
    const week = await this.assignmentsRepository.findWeekById(input.id_week);
    if (!week) throw new NotFoundError(`Semana ${input.id_week} no encontrada`);

    const [parts, assignments] = await Promise.all([
      this.assignmentsRepository.findPartsByWeek(input.id_week),
      this.assignmentsRepository.findAssignmentsByWeek(input.id_week),
    ]);

    return { week, parts, assignments };
  }
}