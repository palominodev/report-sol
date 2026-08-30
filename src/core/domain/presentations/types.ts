import { Assignment } from '@/domain/entities/presentation/Assignment';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { AssignmentRole, PresentationType } from '@/domain/entities/presentation/enums';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';

/** Read-only windowed history row: assignment + its part tipo (R4/R6 feeds). */
export interface AssignmentHistoryRow {
  id_part: number;
  id_week: number;
  id_usuario: number;
  rol: AssignmentRole;
  tipo: PresentationType;
}

/** Read-only view over recent history within the 6-month window. */
export interface HistoryView {
  pairedWithWithin6mo(idUsuario: number): Set<number>;
  tipoHistoryWithin6mo(idUsuario: number): Set<PresentationType>;
  rolHistoryWithin6mo(idUsuario: number): Set<AssignmentRole>;
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
}

/** A pluggable soft rule that contributes a score delta for a candidate. */
export interface MatchingRule {
  readonly id: string;
  score(ctx: ScoringContext): number;
}

export interface UnassignedSlot {
  part: PresentationPart;
  role: AssignmentRole;
}

export interface AssignmentResult {
  assignments: Assignment[];
  unassigned: UnassignedSlot[];
}