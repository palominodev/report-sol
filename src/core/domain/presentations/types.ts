import { Assignment } from '@/domain/entities/presentation/Assignment';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { AssignmentRole } from '@/domain/entities/presentation/enums';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';

/** Read-only view over recent pairing history for the pair-avoidance rule. */
export interface HistoryView {
  pairedWithWithin6mo(idUsuario: number): Set<number>;
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