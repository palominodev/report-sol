import { Assignment } from '@/domain/entities/presentation/Assignment';
import { HistoryView } from '@/core/domain/presentations/types';

/**
 * In-memory HistoryView built from a windowed list of past assignments.
 * Two usuarios are considered "paired" when they appear on the same part
 * within the window. Mirrors the history the 6-month pair rule needs.
 */
export class AssignmentHistoryView implements HistoryView {
  private readonly pairs: Map<number, Set<number>>;

  constructor(assignments: Assignment[]) {
    this.pairs = new Map();
    const byPart = new Map<number, number[]>();
    for (const a of assignments) {
      const list = byPart.get(a.id_part) ?? [];
      if (!list.includes(a.id_usuario)) list.push(a.id_usuario);
      byPart.set(a.id_part, list);
    }
    for (const users of byPart.values()) {
      for (const u of users) {
        for (const v of users) {
          if (u !== v) {
            const set = this.pairs.get(u) ?? new Set<number>();
            set.add(v);
            this.pairs.set(u, set);
          }
        }
      }
    }
  }

  pairedWithWithin6mo(idUsuario: number): Set<number> {
    return new Set(this.pairs.get(idUsuario) ?? []);
  }
}