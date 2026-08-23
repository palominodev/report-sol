import { Assignment } from '@/domain/entities/presentation/Assignment';
import { AssignmentRole } from '@/domain/entities/presentation/enums';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { AssignmentHistoryView } from './AssignmentHistoryView';

export interface AssignmentWarning {
  code: string;
  message: string;
  detail?: Record<string, unknown>;
}

export interface OverrideAssignmentResult {
  assignment: Assignment;
  warnings: AssignmentWarning[];
}

function sixMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

export class OverrideAssignmentUseCase {
  constructor(private readonly assignmentsRepository: IAssignmentsRepository) {}

  async execute(input: {
    id_part: number;
    rol: AssignmentRole;
    id_usuario: number;
  }): Promise<OverrideAssignmentResult> {
    const part = await this.assignmentsRepository.findPartById(input.id_part);
    if (!part) throw new NotFoundError(`Presentación ${input.id_part} no encontrada`);

    const weekAssignments = await this.assignmentsRepository.findAssignmentsByWeek(part.id_week);

    // Hard invariant: same-week double-book — the person already has another part this week.
    const doubleBooked = weekAssignments.some(
      (a) => a.id_part !== input.id_part && a.id_usuario === input.id_usuario
    );
    if (doubleBooked) {
      throw new ValidationError(`El publicador ${input.id_usuario} ya tiene asignación esta semana`);
    }

    // Hard invariant: presenter === companion on the same part.
    const sameRoleConflicts = weekAssignments.some(
      (a) => a.id_part === input.id_part && a.rol !== input.rol && a.id_usuario === input.id_usuario
    );
    if (sameRoleConflicts) {
      throw new ValidationError('El presentador y el compañero no pueden ser el mismo publicador');
    }

    const saved = await this.assignmentsRepository.upsertAssignment({
      id_part: input.id_part,
      id_week: part.id_week,
      id_usuario: input.id_usuario,
      rol: input.rol,
      estado: 'manual',
    });

    const warnings = await this.detectWarnings(part.id_part, input, weekAssignments);
    return { assignment: saved, warnings };
  }

  private async detectWarnings(
    id_part: number,
    input: { id_part: number; rol: AssignmentRole; id_usuario: number },
    weekAssignments: Assignment[]
  ): Promise<AssignmentWarning[]> {
    const recent = await this.assignmentsRepository.findRecentAssignments({ desde: sixMonthsAgo() });
    const history = new AssignmentHistoryView(recent);

    // The counterpart on this part is the person in the opposite role.
    const counterpart = weekAssignments.find(
      (a) => a.id_part === id_part && a.rol !== input.rol
    );
    const warnings: AssignmentWarning[] = [];
    if (counterpart) {
      const pairedWith = history.pairedWithWithin6mo(input.id_usuario);
      const otherPairs = history.pairedWithWithin6mo(counterpart.id_usuario);
      if (pairedWith.has(counterpart.id_usuario)) {
        warnings.push({
          code: 'REPEAT_PAIR_6M',
          message: `El publicador ${input.id_usuario} ya fue pareja del publicador ${counterpart.id_usuario} en los últimos 6 meses`,
          detail: { since: sixMonthsAgo() },
        });
      }
    }
    return warnings;
  }
}