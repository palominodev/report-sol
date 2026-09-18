import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';

/** The sala-adoption policies the generar flow accepts (spec R2/R6). */
export const SALA_POLICIES = ['adopt_and_clone', 'rebuild'] as const;
export type SalaPolicy = (typeof SALA_POLICIES)[number];

export interface AdoptSalaRoomsResult {
  /** NULL-sala parts stamped to 'A'. */
  stamped: number;
  /** 'B' clones inserted (FULL MIRROR: every 'A' gains its 'B'). */
  cloned: number;
  /** Surplus NULL rows deleted ('rebuild' only). */
  removedSurplus: number;
}

/**
 * Normalizes a week's parts into the mirrored A/B layout before generation.
 *
 * Algorithm — parts are grouped by `${tipo}|${orden}` (the merge key); per
 * group, at most one row per sala value can exist (expression unique index),
 * so a group is some subset of {NULL row, 'A' row, 'B' row}:
 *
 * - adopt_and_clone: every NULL row in a group with NO 'A' is stamped 'A'.
 *   A NULL row next to an existing 'A' (pre-migration re-sync garbage) is left
 *   in place — stamping it would violate the unique index, and garbage
 *   collection belongs to 'rebuild'.
 * - rebuild: same stamping, PLUS surplus NULL rows in groups already holding
 *   an 'A' are deleted. Every doomed row must carry no assignments; if any
 *   does, the whole execution fails with ValidationError BEFORE any write
 *   (no partial application).
 * - FULL MIRROR corollary (both policies): every group with ≥1 'A' and no
 *   'B' gains exactly one 'B' clone — orden, tipo, seccion, duracion_min,
 *   escenario and fuente (leccion, punto) copied verbatim, sala='B', and NO
 *   assignment rows (the matcher fills both rooms on the generate step).
 *
 * Lone-'B' groups (a manual room layout with no 'A' and no NULL) are
 * deliberately untouched under BOTH policies: there is nothing to stamp, no
 * 'A' to clone from, and their 'B' already exists.
 *
 * Idempotent by construction: on a fully mirrored week every group is
 * {A, B}, the plan is empty, and execution is a zero-write success no-op.
 * (A crash between the three port writes can partially apply a plan, but a
 * re-run of the same policy always completes it — each write is idempotent
 * and the plan shrinks monotonically.)
 */
export class AdoptSalaRoomsUseCase {
  constructor(private readonly assignmentsRepository: IAssignmentsRepository) {}

  async execute(input: { id_week: number; policy: SalaPolicy }): Promise<AdoptSalaRoomsResult> {
    if (!(SALA_POLICIES as readonly string[]).includes(input.policy)) {
      throw new ValidationError(
        `Política de sala inválida: ${String(input.policy)} (valores válidos: ${SALA_POLICIES.join(' | ')})`
      );
    }
    if (!Number.isInteger(input.id_week)) {
      throw new NotFoundError(`Semana ${input.id_week} no encontrada`);
    }

    const week = await this.assignmentsRepository.findWeekById(input.id_week);
    if (!week) throw new NotFoundError(`Semana ${input.id_week} no encontrada`);

    const [parts, assignments] = await Promise.all([
      this.assignmentsRepository.findPartsByWeek(input.id_week),
      this.assignmentsRepository.findAssignmentsByWeek(input.id_week),
    ]);
    const assignedPartIds = new Set(assignments.map((a) => a.id_part));

    const groups = new Map<string, PresentationPart[]>();
    for (const part of parts) {
      const key = `${part.tipo}|${part.orden}`;
      const group = groups.get(key);
      if (group) group.push(part);
      else groups.set(key, [part]);
    }

    const stamps: { id_part: number; sala: 'A' }[] = [];
    const surplus: PresentationPart[] = [];
    const clones: PresentationPart[] = [];

    for (const group of groups.values()) {
      const hasA = group.some((p) => p.sala === 'A');
      const hasB = group.some((p) => p.sala === 'B');
      const nulls = group.filter((p) => p.sala === null);

      if (input.policy === 'rebuild' && hasA) {
        // Surplus NULL rows next to an 'A' are re-sync garbage. They must
        // carry no assignments — a manual row is never garbage, so the whole
        // plan is rejected instead of deleting someone's work.
        const protectedRows = nulls.filter((p) => assignedPartIds.has(p.id_part));
        if (protectedRows.length > 0) {
          throw new ValidationError(
            `No se puede reconstruir: la parte ${protectedRows[0].id_part} sin sala tiene asignaciones; usa adopt_and_clone`
          );
        }
        surplus.push(...nulls);
      } else if (!hasA && nulls.length > 0) {
        // Stamp NULL → 'A'. Only when the group holds no 'A': the unique
        // index rejects a second 'A' in the same slot, and a NULL next to an
        // 'A' is rebuild's garbage, not adopt's.
        stamps.push(...nulls.map((p) => ({ id_part: p.id_part, sala: 'A' as const })));
      }

      // FULL MIRROR on the POST-stamp state: a group whose NULL row was just
      // stamped now holds an 'A' and needs its 'B' twin too.
      const willHaveA = hasA || nulls.length > 0;
      if (willHaveA && !hasB) {
        const original = group.find((p) => p.sala === 'A') ?? nulls[0];
        clones.push(
          new PresentationPart(
            0, // placeholder: insertParts lets the DB assign real ids
            original.id_week,
            original.orden,
            original.tipo,
            original.seccion,
            original.duracion_min,
            original.escenario,
            original.fuente,
            'B'
          )
        );
      }
      // Lone-'B' groups fall through every branch: untouched by design.
    }

    // Validation is complete — apply the plan (each call is one atomic batch).
    if (surplus.length > 0) {
      await this.assignmentsRepository.deletePartsByIds(surplus.map((p) => p.id_part));
    }
    if (stamps.length > 0) {
      await this.assignmentsRepository.bulkUpdatePartSala(stamps);
    }
    if (clones.length > 0) {
      await this.assignmentsRepository.insertParts(clones);
    }

    return { stamped: stamps.length, cloned: clones.length, removedSurplus: surplus.length };
  }
}
