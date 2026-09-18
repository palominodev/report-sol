import { describe, it, expect } from 'vitest';
import { NoRepeatTipoRule } from '../NoRepeatTipoRule';
import { AssignmentEngineState, HistoryView, ScoringContext } from '../../types';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import { PresentationType } from '@/domain/entities/presentation/enums';

function person(id: number): AssignablePerson {
  return new AssignablePerson(id, `N${id}`, `A${id}`, 'masculino', null, null);
}

function part(id: number, tipo: PresentationType): PresentationPart {
  return new PresentationPart(id, 100, 1, tipo, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1));
}

/** History where only `personId` carries the given tipos in the 6-month window. */
function historyWithTipos(personId: number, tipos: PresentationType[]): HistoryView {
  return {
    pairedWithWithin6mo: () => new Set(),
    tipoHistoryWithin6mo: (id) => (id === personId ? new Set(tipos) : new Set()),
    rolHistoryWithin6mo: () => new Set(),
  };
}

function ctx(candidate: AssignablePerson, tipo: PresentationType, history: HistoryView): ScoringContext {
  return {
    person: candidate,
    part: part(candidate.id_usuario, tipo),
    role: 'presentador',
    weekState: { byPart: new Map(), assignedPersonIds: new Set() } as AssignmentEngineState,
    history,
    personsById: new Map([[candidate.id_usuario, candidate]]),
  };
}

describe('NoRepeatTipoRule (R4 no repeat part tipo within 6 months)', () => {
  const rule = new NoRepeatTipoRule();

  it('hard-blocks a candidate who held the same tipo within the 6-month window', () => {
    const candidate = person(1);
    const recent = historyWithTipos(1, ['lectura_biblia']);
    expect(rule.isAllowed(ctx(candidate, 'lectura_biblia', recent))).toBe(false);
  });

  it('allows the same tipo when it falls outside the window (absent from 6mo history)', () => {
    const candidate = person(1);
    // "7 months ago" is outside the repository's 6-month window: not in history.
    const empty = historyWithTipos(1, []);
    expect(rule.isAllowed(ctx(candidate, 'lectura_biblia', empty))).toBe(true);
  });

  it('allows a different tipo than the one held recently', () => {
    const candidate = person(1);
    const history = historyWithTipos(1, ['haga_revisitas']);
    expect(rule.isAllowed(ctx(candidate, 'lectura_biblia', history))).toBe(true);
  });

  it('is scoped per person: another candidate with the same recent tipo is unaffected', () => {
    // Person 1 held lectura_biblia; person 2 did not.
    const history = historyWithTipos(1, ['lectura_biblia']);
    expect(rule.isAllowed(ctx(person(2), 'lectura_biblia', history))).toBe(true);
  });

  it('contributes zero to soft ranking', () => {
    expect(rule.score(ctx(person(1), 'lectura_biblia', historyWithTipos(1, [])))).toBe(0);
  });
});