import { AssignmentRole, PresentationType, Sala } from '@/domain/entities/presentation/enums';
import { AssignmentHistoryRow, HistoryView, SalaPartnerKey } from '@/core/domain/presentations/types';

/**
 * In-memory HistoryView built from a windowed list of past assignments (rows
 * already scoped to the shared 26-week window by the repository query).
 * Exposes:
 * - paired pairs (R5): two usuarios paired when on the same part in the window
 * - per-person part-tipo history (R4)
 * - per-person rol history (R6)
 * - per-person sala#partner combinations (joint sala+acompañante repeat feed)
 */
export class AssignmentHistoryView implements HistoryView {
  private readonly pairs: Map<number, Set<number>>;
  private readonly tiposByPerson: Map<number, Set<PresentationType>>;
  private readonly rolesByPerson: Map<number, Set<AssignmentRole>>;
  private readonly combosByPerson: Map<number, Set<SalaPartnerKey>>;

  constructor(assignments: AssignmentHistoryRow[]) {
    this.pairs = new Map();
    this.tiposByPerson = new Map();
    this.rolesByPerson = new Map();
    this.combosByPerson = new Map();

    const byPart = new Map<number, number[]>();
    const salaByPart = new Map<number, Sala | null>();
    for (const a of assignments) {
      const list = byPart.get(a.id_part) ?? [];
      if (!list.includes(a.id_usuario)) list.push(a.id_usuario);
      byPart.set(a.id_part, list);
      // Sala is a part-level attribute: every row of a part carries the same value.
      salaByPart.set(a.id_part, a.sala);

      const tipos = this.tiposByPerson.get(a.id_usuario) ?? new Set<PresentationType>();
      tipos.add(a.tipo);
      this.tiposByPerson.set(a.id_usuario, tipos);

      const roles = this.rolesByPerson.get(a.id_usuario) ?? new Set<AssignmentRole>();
      roles.add(a.rol);
      this.rolesByPerson.set(a.id_usuario, roles);
    }
    for (const [idPart, users] of byPart) {
      const sala = salaByPart.get(idPart) ?? null;
      for (const u of users) {
        for (const v of users) {
          if (u !== v) {
            const set = this.pairs.get(u) ?? new Set<number>();
            set.add(v);
            this.pairs.set(u, set);

            // Joint feed: NULL-sala parts contribute nothing (unknown room).
            // Single-person parts never reach here (no u !== v pair exists).
            if (sala !== null) {
              const combos = this.combosByPerson.get(u) ?? new Set<SalaPartnerKey>();
              combos.add(`${sala}#${v}`);
              this.combosByPerson.set(u, combos);
            }
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

  salaPartnerCombos(idUsuario: number): ReadonlySet<SalaPartnerKey> {
    return new Set(this.combosByPerson.get(idUsuario) ?? []);
  }
}