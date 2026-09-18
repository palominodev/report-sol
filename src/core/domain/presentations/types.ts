import { Assignment } from '@/domain/entities/presentation/Assignment';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { AssignmentRole, PresentationType, Sala } from '@/domain/entities/presentation/enums';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';

/** Read-only windowed history row: assignment + its part tipo/sala (R4/R6/sala feeds). */
export interface AssignmentHistoryRow {
  id_part: number;
  id_week: number;
  id_usuario: number;
  rol: AssignmentRole;
  tipo: PresentationType;
  /** Room of the assigned part; NULL passes through, never defaulted. */
  sala: Sala | null;
}

/**
 * Joint repetition key: the person already participated in room `Sala`
 * together with partner `number` inside the history window.
 */
export type SalaPartnerKey = `${Sala}#${number}`;

/**
 * Read-only view over recent history within the shared 26-week window
 * (accessor names still say Within6mo for continuity; see history-window.ts).
 */
export interface HistoryView {
  pairedWithWithin6mo(idUsuario: number): Set<number>;
  tipoHistoryWithin6mo(idUsuario: number): Set<PresentationType>;
  rolHistoryWithin6mo(idUsuario: number): Set<AssignmentRole>;
  /**
   * In-window `sala#partner` combinations the person already lived.
   * Rows with NULL part sala and single-person parts contribute nothing.
   */
  salaPartnerCombos(idUsuario: number): ReadonlySet<SalaPartnerKey>;
}

/** Mutable working state the engine keeps while assigning a week. */
export interface AssignmentEngineState {
  byPart: Map<number, number[]>;
  assignedPersonIds: Set<number>;
}

export interface ScoringContext {
  person: AssignablePerson;
  part: PresentationPart;
  role: AssignmentRole;
  weekState: AssignmentEngineState;
  history: HistoryView;
  /** Every assignable person by id, for resolving already-committed co-persons. */
  personsById: ReadonlyMap<number, AssignablePerson>;
}

/**
 * A pluggable matching rule. `isAllowed` is the HARD eligibility gate
 * (optional: a rule that only defines `score` is automatically allowed);
 * `score` contributes a soft ranking delta.
 */
export interface MatchingRule {
  readonly id: string;
  isAllowed?(ctx: ScoringContext): boolean;
  score(ctx: ScoringContext): number;
}

export interface UnassignedSlot {
  part: PresentationPart;
  role: AssignmentRole;
  /** Diagnostic: why no candidate could fill this slot. */
  reason: string;
}

export interface AssignmentResult {
  assignments: Assignment[];
  unassigned: UnassignedSlot[];
}