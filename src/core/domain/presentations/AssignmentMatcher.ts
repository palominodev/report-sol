import { Assignment } from '@/domain/entities/presentation/Assignment';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { AssignmentRole } from '@/domain/entities/presentation/enums';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { RuleRegistry } from './RuleRegistry';
import {
  AssignmentEngineState,
  AssignmentResult,
  HistoryView,
  ScoringContext,
  UnassignedSlot,
} from './types';

export type { AssignmentEngineState, AssignmentResult, HistoryView, UnassignedSlot };

/** Role assignment order for a two-person part: presenter first, then companion. */
const TWO_PERSON_ROLES: AssignmentRole[] = ['presentador', 'companero'];
const ONE_PERSON_ROLES: AssignmentRole[] = ['presentador'];

/**
 * Pure, deterministic assignment engine. Applies always-on invariant filters,
 * then scores candidates through a RuleRegistry of pluggable soft rules, then
 * greedily fills each slot keeping the part's remaining roles feasible.
 * Performs no I/O, so it is trivial to test with an in-memory HistoryView.
 */
export class AssignmentMatcher {
  constructor(private readonly registry: RuleRegistry) {}

  match(parts: PresentationPart[], persons: AssignablePerson[], history: HistoryView): AssignmentResult {
    const state: AssignmentEngineState = { byPart: new Map(), assignedPersonIds: new Set() };
    // Every assignable person by id: rules resolve already-committed co-persons.
    const personsById = new Map(persons.map((p) => [p.id_usuario, p] as const));
    const assignments: Assignment[] = [];
    const unassigned: UnassignedSlot[] = [];
    const eligible = persons.filter((p) => p.elegible());
    const ordered = [...parts].sort((a, b) => this.compareByTightness(a, b));

    for (const part of ordered) {
      for (const role of this.rolesFor(part)) {
        const candidates = eligible.filter((p) => this.acceptable(part, role, p, state, history, personsById));
        const ranked = candidates
          .map((p) => ({ person: p, score: this.scoreFor(part, role, p, state, history, personsById) }))
          .sort((x, y) => this.compareByScore(x, y));

        const chosen = ranked.find(({ person }) => this.keepsFeasible(part, role, person, state, eligible));
        if (chosen) {
          this.commit(state, part, chosen.person);
          assignments.push(
            new Assignment(0, part.id_part, part.id_week, chosen.person.id_usuario, role, 'draft')
          );
        } else {
          const reason = candidates.length === 0 ? 'no_eligible_candidate' : 'no_feasible_candidate';
          unassigned.push({ part, role, reason });
          break; // a lone presenter/companion is invalid: skip the rest of this part
        }
      }
    }

    return { assignments, unassigned };
  }

  private compareByTightness(a: PresentationPart, b: PresentationPart): number {
    const aCount = this.rolesFor(a).length;
    const bCount = this.rolesFor(b).length;
    if (aCount !== bCount) return aCount - bCount;
    return a.id_part - b.id_part;
  }

  private rolesFor(part: PresentationPart): AssignmentRole[] {
    return part.requiresCompanero() ? TWO_PERSON_ROLES : ONE_PERSON_ROLES;
  }

  private acceptable(
    part: PresentationPart,
    role: AssignmentRole,
    p: AssignablePerson,
    state: AssignmentEngineState,
    history: HistoryView,
    personsById: ReadonlyMap<number, AssignablePerson>
  ): boolean {
    if (state.assignedPersonIds.has(p.id_usuario)) return false;
    const onPart = state.byPart.get(part.id_part) ?? [];
    if (onPart.includes(p.id_usuario)) return false; // presenter !== companion on the same part
    // Hard eligibility: every rule must allow the candidate. Rules without an
    // isAllowed gate default to true (backward-compatible soft-only rules).
    const ctx: ScoringContext = { person: p, part, role, weekState: state, history, personsById };
    return this.registry.all().every((rule) => (rule.isAllowed ? rule.isAllowed(ctx) : true));
  }

  private scoreFor(
    part: PresentationPart,
    role: AssignmentRole,
    p: AssignablePerson,
    state: AssignmentEngineState,
    history: HistoryView,
    personsById: ReadonlyMap<number, AssignablePerson>
  ): number {
    const ctx: ScoringContext = { person: p, part, role, weekState: state, history, personsById };
    return this.registry.all().reduce((sum, rule) => sum + rule.score(ctx), 0);
  }

  private compareByScore(
    x: { person: AssignablePerson; score: number },
    y: { person: AssignablePerson; score: number }
  ): number {
    if (y.score !== x.score) return y.score - x.score; // score desc
    return x.person.id_usuario - y.person.id_usuario; // id asc, deterministic
  }

  /** True when assigning `person` to `role` still leaves every later role fillable. */
  private keepsFeasible(
    part: PresentationPart,
    role: AssignmentRole,
    person: AssignablePerson,
    state: AssignmentEngineState,
    eligible: AssignablePerson[]
  ): boolean {
    const roles = this.rolesFor(part);
    const later = roles.slice(roles.indexOf(role) + 1);
    if (later.length === 0) return true;

    const tempAssigned = new Set(state.assignedPersonIds);
    tempAssigned.add(person.id_usuario);

    return later.every(() =>
      eligible.some((q) => q.id_usuario !== person.id_usuario && !tempAssigned.has(q.id_usuario))
    );
  }

  private commit(state: AssignmentEngineState, part: PresentationPart, person: AssignablePerson): void {
    state.assignedPersonIds.add(person.id_usuario);
    const current = state.byPart.get(part.id_part) ?? [];
    current.push(person.id_usuario);
    state.byPart.set(part.id_part, current);
  }
}