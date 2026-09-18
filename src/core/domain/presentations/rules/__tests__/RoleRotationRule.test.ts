import { describe, it, expect } from 'vitest';
import { RoleRotationRule, ROL_ROTATION_PENALTY } from '../RoleRotationRule';
import { AssignmentEngineState, HistoryView, ScoringContext } from '../../types';
import { AssignmentMatcher } from '../../AssignmentMatcher';
import { RuleRegistry } from '../../RuleRegistry';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import { AssignmentRole } from '@/domain/entities/presentation/enums';

function person(id: number): AssignablePerson {
  return new AssignablePerson(id, `N${id}`, `A${id}`, 'masculino', null, null);
}

function part(id: number, requiereCompanero: boolean): PresentationPart {
  const tipo = requiereCompanero ? 'empiece_conversaciones' : 'lectura_biblia';
  return new PresentationPart(id, 100, 1, tipo, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1));
}

/** History where `personId` held the given roles within the 6-month window. */
function historyWithRoles(personId: number, roles: AssignmentRole[]): HistoryView {
  return {
    pairedWithWithin6mo: () => new Set(),
    tipoHistoryWithin6mo: () => new Set(),
    rolHistoryWithin6mo: (id) => (id === personId ? new Set(roles) : new Set()),
    salaPartnerCombos: () => new Set(),
  };
}

function ctx(
  candidate: AssignablePerson,
  role: AssignmentRole,
  history: HistoryView,
  requiereCompanero = true
): ScoringContext {
  return {
    person: candidate,
    part: part(candidate.id_usuario, requiereCompanero),
    role,
    weekState: { byPart: new Map(), assignedPersonIds: new Set() } as AssignmentEngineState,
    history,
    personsById: new Map([[candidate.id_usuario, candidate]]),
  };
}

describe('RoleRotationRule (R6 no repeat rol within 6 months, soft)', () => {
  const rule = new RoleRotationRule();

  it('applies a negative penalty when the candidate recently held the same rol', () => {
    const repeated = historyWithRoles(1, ['presentador']);
    expect(rule.score(ctx(person(1), 'presentador', repeated))).toBe(-ROL_ROTATION_PENALTY);
  });

  it('scores 0 for a different rol than the one recently held', () => {
    const history = historyWithRoles(1, ['presentador']);
    expect(rule.score(ctx(person(1), 'companero', history))).toBe(0);
  });

  it('scores 0 when the rol history is empty', () => {
    expect(rule.score(ctx(person(1), 'presentador', historyWithRoles(1, [])))).toBe(0);
  });

  it('never hard-excludes: an unavoidable repeat still fills the slot (penalty accepted)', () => {
    // Soft-only registry (no hard rules). Both candidates recently presented,
    // so both carry the penalty, but the slot MUST still be filled because R6
    // is a ranking penalty, not an eligibility gate.
    const registry = new RuleRegistry();
    registry.register(new RoleRotationRule());
    const matcher = new AssignmentMatcher(registry);

    const persons = [person(1), person(2)];
    const history = historyWithRoles(1, ['presentador']);
    // History must cover both candidates for the unavoidable case.
    const bothRepeated: HistoryView = {
      ...history,
      rolHistoryWithin6mo: (id) => (id === 1 || id === 2 ? new Set(['presentador']) : new Set()),
    };
    const result = matcher.match([part(10, false)], persons, bothRepeated);

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].rol).toBe('presentador');
    expect(result.unassigned).toHaveLength(0);
  });
});