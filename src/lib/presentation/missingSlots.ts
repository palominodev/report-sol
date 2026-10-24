import { presentationTypeLabel, salaLabel } from './status';
import type { PresentationType, Sala } from '@/domain/entities/presentation/enums';

export type SlotRole = 'presentador' | 'companero';

export interface MissingSlot {
  id_part: number;
  rol: SlotRole;
}

export interface SlotCoverage {
  total: number;
  assigned: number;
  missing: MissingSlot[];
}

/**
 * Mirrors ConfirmWeekAssignmentsUseCase.findMissingSlots: a part needs
 * `presentador`, plus `companero` when it requires one; a slot is covered
 * when an assignment row with that id_part and rol exists.
 */
export function computeSlotCoverage(
  parts: ReadonlyArray<{ id_part: number; requiresCompanero(): boolean }>,
  assignments: ReadonlyArray<{ id_part: number; rol: SlotRole }>
): SlotCoverage {
  const missing: MissingSlot[] = [];
  let total = 0;
  for (const part of parts) {
    const roles: SlotRole[] = part.requiresCompanero() ? ['presentador', 'companero'] : ['presentador'];
    for (const rol of roles) {
      total += 1;
      if (!assignments.some((a) => a.id_part === part.id_part && a.rol === rol)) {
        missing.push({ id_part: part.id_part, rol });
      }
    }
  }
  return { total, assigned: total - missing.length, missing };
}

interface DescribablePart {
  id_part: number;
  orden: number;
  tipo: string;
  sala: Sala | null;
}

/**
 * Readable, unique label per uncovered slot, e.g. "Falta presentador en «Haga revisitas» (Sala A (Principal))".
 * Parts of the same type in the same room get "n.º 1", "n.º 2"... by on-screen order, so two
 * identical-looking lines can never appear.
 */
export function describeMissingSlots(
  parts: ReadonlyArray<DescribablePart>,
  missing: ReadonlyArray<MissingSlot>
): string[] {
  const byId = new Map(parts.map((p) => [p.id_part, p]));
  const sameKind = (a: DescribablePart, b: DescribablePart) => a.tipo === b.tipo && a.sala === b.sala;

  return missing.flatMap((slot) => {
    const part = byId.get(slot.id_part);
    if (!part) return [];
    const siblings = parts.filter((p) => sameKind(p, part)).sort((a, b) => a.orden - b.orden);
    const position = siblings.findIndex((p) => p.id_part === part.id_part) + 1;
    const numbered = siblings.length > 1 ? ` n.º ${position}` : '';
    const room = salaLabel(part.sala);
    const role = slot.rol === 'presentador' ? 'presentador' : 'compañero';
    const name = presentationTypeLabel(part.tipo as PresentationType);
    return [`Falta ${role} en «${name}»${numbered}${room ? ` (${room})` : ''}`];
  });
}
