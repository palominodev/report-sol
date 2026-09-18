import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { Assignment } from '@/domain/entities/presentation/Assignment';
import { AssignmentMatcher } from '@/core/domain/presentations/AssignmentMatcher';
import { RuleRegistry } from '@/core/domain/presentations/RuleRegistry';
import { UnassignedSlot } from '@/core/domain/presentations/types';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { UnprocessableError } from '@/core/domain/errors/UnprocessableError';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { IUserRepository } from '@/core/domain/repositories/IUserRepository';
import { AssignmentHistoryView } from './AssignmentHistoryView';

export interface GenerateWeekAssignmentsResult {
  assignments: Assignment[];
  unassigned: UnassignedSlot[];
}

function sixMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

export class GenerateWeekAssignmentsUseCase {
  private readonly matcher: AssignmentMatcher;
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly assignmentsRepository: IAssignmentsRepository,
    registry: RuleRegistry
  ) {
    // The registry is injected (di.ts getMatchingRules owns the rule list);
    // no ctor-side registration, so adding/removing a rule is a single
    // factory line and never touches this use case.
    this.matcher = new AssignmentMatcher(registry);
  }

  async execute(input: { id_week: number }): Promise<GenerateWeekAssignmentsResult> {
    const week = await this.assignmentsRepository.findWeekById(input.id_week);
    if (!week) throw new NotFoundError(`Semana ${input.id_week} no encontrada`);

    const persons = await this.userRepository.findAllAssignable();
    const eligible = persons.filter((p) => p.elegible());
    if (eligible.length === 0) {
      throw new UnprocessableError('No hay publicadores elegibles (con genero definido)');
    }

    const parts = await this.assignmentsRepository.findPartsByWeek(input.id_week);

    // Preserve manual rows: don't re-match people already manually booked this week.
    const existing = await this.assignmentsRepository.findAssignmentsByWeek(input.id_week);
    const manualPersons = new Set(
      existing.filter((a) => a.estado === 'manual').map((a) => a.id_usuario)
    );
    const candidates: AssignablePerson[] = persons.filter(
      (p) => !manualPersons.has(p.id_usuario)
    );

    // Preload 6-month pairing history into an in-memory HistoryView.
    const recent = await this.assignmentsRepository.findRecentAssignments({ desde: sixMonthsAgo() });
    const history = new AssignmentHistoryView(recent);

    const result = this.matcher.match(parts, candidates, history);

    // Remove unreferenced non-manual rows (draft/confirmed) but never manual rows,
    // then persist the freshly generated drafts.
    await this.assignmentsRepository.deleteNonManualByWeek(input.id_week);
    const written: Assignment[] = [];
    for (const a of result.assignments) {
      // Skip any slot that still holds a manual row.
      const taken = existing.find(
        (e) => e.id_part === a.id_part && e.rol === a.rol && e.estado === 'manual'
      );
      if (taken) continue;
      const saved = await this.assignmentsRepository.upsertAssignment({
        id_part: a.id_part,
        id_week: input.id_week,
        id_usuario: a.id_usuario,
        rol: a.rol,
        estado: 'draft',
      });
      written.push(saved);
    }

    return { assignments: written, unassigned: result.unassigned };
  }
}