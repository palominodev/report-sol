import { Assignment } from '@/domain/entities/presentation/Assignment';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { AssignmentRole } from '@/domain/entities/presentation/enums';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ConflictError } from '@/core/domain/errors/ConflictError';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';

function rolesFor(part: PresentationPart): AssignmentRole[] {
  return part.requiresCompanero() ? ['presentador', 'companero'] : ['presentador'];
}

export class ConfirmWeekAssignmentsUseCase {
  constructor(private readonly assignmentsRepository: IAssignmentsRepository) {}

  async execute(input: { id_week: number }): Promise<{ confirmed: number }> {
    const week = await this.assignmentsRepository.findWeekById(input.id_week);
    if (!week) throw new NotFoundError(`Semana ${input.id_week} no encontrada`);

    const [parts, assignments] = await Promise.all([
      this.assignmentsRepository.findPartsByWeek(input.id_week),
      this.assignmentsRepository.findAssignmentsByWeek(input.id_week),
    ]);

    const missing = this.findMissingSlots(parts, assignments);
    if (missing.length > 0) {
      const detail = missing.map((m) => `${m.id_part}:${m.rol}`).join(', ');
      throw new ConflictError(`La semana aún tiene asignaciones sin cubrir: ${detail}`);
    }

    const confirmed = await this.assignmentsRepository.confirmWeek(input.id_week);
    return { confirmed };
  }

  private findMissingSlots(
    parts: PresentationPart[],
    assignments: Assignment[]
  ): { id_part: number; rol: AssignmentRole }[] {
    const missing: { id_part: number; rol: AssignmentRole }[] = [];
    for (const part of parts) {
      const onPart = assignments.filter((a) => a.id_part === part.id_part);
      for (const rol of rolesFor(part)) {
        if (!onPart.some((a) => a.rol === rol)) {
          missing.push({ id_part: part.id_part, rol });
        }
      }
    }
    return missing;
  }
}