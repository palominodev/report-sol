import { describe, it, expect } from 'vitest';
import { NoRepeatPairWithin6MonthsRule, REPEAT_PAIR_PENALTY } from '../NoRepeatPairWithin6MonthsRule';
import { AssignmentEngineState, HistoryView, MatchingRule, ScoringContext } from '../types';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';

function person(id: number): AssignablePerson {
  return new AssignablePerson(id, `N${id}`, `A${id}`, 'masculino', null, null);
}

function twoPersonPart(id: number): PresentationPart {
  return new PresentationPart(id, 100, 1, 'empiece_conversaciones', 'TESOROS_DE_LA_BIBLIA', 5, null, new SourceRef('lmd', 1));
}

function engineState(chosenCompanions: number[]): AssignmentEngineState {
  const state: AssignmentEngineState = { byPart: new Map(), assignedPersonIds: new Set() };
  if (chosenCompanions.length > 0) {
    state.byPart.set(10, [...chosenCompanions]);
    for (const id of chosenCompanions) state.assignedPersonIds.add(id);
  }
  return state;
}

function historyOf(map: Record<number, number[]>): HistoryView {
  return {
    pairedWithWithin6mo: (id) => new Set(map[id] ?? []),
    tipoHistoryWithin6mo: () => new Set(),
    rolHistoryWithin6mo: () => new Set(),
    salaPartnerCombos: () => new Set(),
  };
}

function ctx(candidateId: number, chosenCompanionIds: number[], history: HistoryView): ScoringContext {
  const persons = [person(candidateId), ...chosenCompanionIds.map((id) => person(id))];
  return {
    person: person(candidateId),
    part: twoPersonPart(10),
    role: 'companero',
    weekState: engineState(chosenCompanionIds),
    history,
    personsById: new Map(persons.map((p) => [p.id_usuario, p])),
  };
}

describe('NoRepeatPairWithin6MonthsRule', () => {
  // Typed as the MatchingRule contract: the test asserts the SOFT-ONLY shape
  // (isAllowed absent → engine default true), which the class type cannot see.
  const rule: MatchingRule = new NoRepeatPairWithin6MonthsRule();

  it('scores 0 when no companion has been chosen yet on the part', () => {
    expect(rule.score(ctx(2, [], historyOf({})))).toBe(0);
  });

  it('scores 0 when the candidate was not paired with the chosen companion within 6 months', () => {
    // candidate 2 paired with 99 in the past; chosen companion is 1, never paired with 2.
    expect(rule.score(ctx(2, [1], historyOf({ 2: [99], 1: [] })))).toBe(0);
  });

  it('scores -K when the candidate recorded a recent pair with the chosen companion', () => {
    expect(rule.score(ctx(2, [1], historyOf({ 2: [1], 1: [] })))).toBe(-REPEAT_PAIR_PENALTY);
  });

  it('scores -K when the chosen companion side recorded the recent pair', () => {
    expect(rule.score(ctx(2, [1], historyOf({ 2: [], 1: [2] })))).toBe(-REPEAT_PAIR_PENALTY);
  });

  it('does not define isAllowed: soft-only rules rely on the default true gate', () => {
    // R5 only implements score(); the extended MatchingRule contract makes
    // isAllowed optional and the engine treats an absent gate as allowed.
    expect(rule.isAllowed).toBeUndefined();
  });
});