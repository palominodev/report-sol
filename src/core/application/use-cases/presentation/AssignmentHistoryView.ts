import { AssignmentRole, PresentationType } from '@/domain/entities/presentation/enums';
import { AssignmentHistoryRow, HistoryView } from '@/core/domain/presentations/types';

/**
 * In-memory HistoryView built from a windowed list of past assignments (rows
 * already scoped to the 6-month window by the repository query). Exposes:
 * - paired pairs (R5): two usuarios paired when on the same part in the window
 * - per-person part-tipo history (R4)
 * - per-person rol history (R6)
 */
export class AssignmentHistoryView implements HistoryView {
  private readonly pairs: Map<number, Set<number>>;
  private readonly tiposByPerson: Map<number, Set<PresentationType>>;
  private readonly rolesByPerson: Map<number, Set<AssignmentRole>>;

  constructor(assignments: AssignmentHistoryRow[]) {
    this.pairs = new Map();
    this.tiposByPerson = new Map();
    this.rolesByPerson = new Map();

    const byPart = new Map<number, number[]>();
    for (const a of assignments) {
      const list = byPart.get(a.id_part) ?? [];
      if (!list.includes(a.id_usuario)) list.push(a.id_usuario);
      byPart.set(a.id_part, list);

      const tipos = this.tiposByPerson.get(a.id_usuario) ?? new Set<PresentationType>();
      tipos.add(a.tipo);
      this.tiposByPerson.set(a.id_usuario, tipos);

      const roles = this.rolesByPerson.get(a.id_usuario) ?? new Set<AssignmentRole>();
      roles.add(a.rol);
      this.rolesByPerson.set(a.id_usuario, roles);
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

  tipoHistoryWithin6mo(idUsuario: number): Set<PresentationType> {
    return new Set(this.tiposByPerson.get(idUsuario) ?? []);
  }

  rolHistoryWithin6mo(idUsuario: number): Set<AssignmentRole> {
    return new Set(this.rolesByPerson.get(idUsuario) ?? []);
  }
}