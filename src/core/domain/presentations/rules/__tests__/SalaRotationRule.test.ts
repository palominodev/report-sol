import { describe, it, expect } from 'vitest';
import { SalaRotationRule, REPEAT_SALA_PARTNER_PENALTY } from '../SalaRotationRule';
import { AssignmentEngineState, HistoryView, ScoringContext, SalaPartnerKey } from '../../types';
import { AssignmentMatcher } from '../../AssignmentMatcher';
import { RuleRegistry } from '../../RuleRegistry';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import { AssignmentRole, PresentationType, Sala } from '@/domain/entities/presentation/enums';

const TWO_PERSON_TIPOS = [
  'empiece_conversaciones',
  'haga_revisitas',
  'haga_discipulos',
  'explique_sus_creencias',
] as const satisfies readonly PresentationType[];

const SINGLE_PERSON_TIPOS = ['que_diria', 'lectura_biblia', 'discurso'] as const satisfies readonly PresentationType[];

function person(id: number): AssignablePerson {
  return new AssignablePerson(id, `N${id}`, `A${id}`, 'masculino', null, null);
}

function part(id: number, tipo: PresentationType, sala: Sala | null): PresentationPart {
  return new PresentationPart(id, 100, 1, tipo, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1), sala);
}

/**
 * Fake HistoryView where only `personId` carries the given sala#partner keys.
 * Rol independence is established at the view level (combos are built from
 * any prior participation regardless of rol — see AssignmentHistoryView tests).
 */
function historyWithCombos(personId: number, keys: SalaPartnerKey[]): HistoryView {
  return {
    pairedWithWithin6mo: () => new Set(),
    tipoHistoryWithin6mo: () => new Set(),
    rolHistoryWithin6mo: () => new Set(),
    salaPartnerCombos: (id) => (id === personId ? new Set(keys) : new Set()),
  };
}

function ctx(
  candidate: AssignablePerson,
  part: PresentationPart,
  history: HistoryView,
  options: { role?: AssignmentRole; committedCompanions?: number[] } = {}
): ScoringContext {
  const committed = options.committedCompanions ?? [];
  return {
    person: candidate,
    part,
    role: options.role ?? 'companero',
    weekState: {
      byPart: new Map([[part.id_part, committed]]),
      assignedPersonIds: new Set(committed),
    } as AssignmentEngineState,
    history,
    personsById: new Map([[candidate.id_usuario, candidate]]),
  };
}

describe('SalaRotationRule (joint sala+acompañante repeat, soft)', () => {
  const rule = new SalaRotationRule();

  it('penalizes when BOTH sala and companion repeat an in-window participation', () => {
    const history = historyWithCombos(1, ['A#2']);
    const candidate = person(1);
    const context = ctx(candidate, part(10, 'haga_revisitas', 'A'), history, { committedCompanions: [2] });

    expect(rule.score(context)).toBe(-REPEAT_SALA_PARTNER_PENALTY);
  });

  it('scores 0 when only the sala repeats (different companion)', () => {
    const history = historyWithCombos(1, ['A#3']);
    const candidate = person(1);
    const context = ctx(candidate, part(10, 'haga_revisitas', 'A'), history, { committedCompanions: [2] });

    expect(rule.score(context)).toBe(0);
  });

  it('scores 0 when only the companion repeats (different sala)', () => {
    const history = historyWithCombos(1, ['B#2']);
    const candidate = person(1);
    const context = ctx(candidate, part(10, 'haga_revisitas', 'A'), history, { committedCompanions: [2] });

    expect(rule.score(context)).toBe(0);
  });

  it('scores 0 when the candidate part has NULL sala (unknown room)', () => {
    const history = historyWithCombos(1, ['A#2']);
    const candidate = person(1);
    const context = ctx(candidate, part(10, 'haga_revisitas', null), history, { committedCompanions: [2] });

    expect(rule.score(context)).toBe(0);
  });

  it('scores 0 when no companion is committed yet (single-person slot)', () => {
    const history = historyWithCombos(1, ['A#2']);
    const candidate = person(1);
    const context = ctx(candidate, part(10, 'haga_revisitas', 'A'), history);

    expect(rule.score(context)).toBe(0);
  });

  describe('applies to every two-person tipo', () => {
    for (const tipo of TWO_PERSON_TIPOS) {
      it(`fires on ${tipo}`, () => {
        const history = historyWithCombos(1, ['A#2']);
        const candidate = person(1);
        const context = ctx(candidate, part(10, tipo, 'A'), history, { committedCompanions: [2] });

        expect(rule.score(context)).toBe(-REPEAT_SALA_PARTNER_PENALTY);
      });
    }
  });

  describe('never fires on single-person tipos', () => {
    for (const tipo of SINGLE_PERSON_TIPOS) {
      it(`scores 0 on ${tipo} (engine commits no companion)`, () => {
        const history = historyWithCombos(1, ['A#2']);
        const candidate = person(1);
        const context = ctx(candidate, part(10, tipo, 'A'), history);

        expect(rule.score(context)).toBe(0);
      });
    }
  });

  it('is rol-independent: a prior participation as presentador counts when the candidate goes as companero', () => {
    // combos(1) = A#2 comes from a part where 1 was presentador and 2 companero
    const history = historyWithCombos(1, ['A#2']);
    const candidate = person(1);
    const context = ctx(candidate, part(10, 'haga_revisitas', 'A'), history, {
      role: 'companero',
      committedCompanions: [2],
    });

    expect(rule.score(context)).toBe(-REPEAT_SALA_PARTNER_PENALTY);
  });

  it('defines no isAllowed gate: it can never block, only rank', () => {
    expect((rule as { isAllowed?: unknown }).isAllowed).toBeUndefined();
  });

  it('never blocks at engine level: an unavoidable joint repeat still fills the slot', () => {
    // Soft-only registry. Every candidate jointly repeats sala+partner, so all
    // carry the penalty, but both slots MUST be filled because this rule is a
    // ranking penalty, not an eligibility gate (overrides are likewise unaffected).
    const registry = new RuleRegistry();
    registry.register(new SalaRotationRule());
    const matcher = new AssignmentMatcher(registry);

    const persons = [person(1), person(2)];
    const history: HistoryView = {
      ...historyWithCombos(1, []),
      salaPartnerCombos: (id) => (id === 1 || id === 2 ? new Set<SalaPartnerKey>(['A#1', 'A#2']) : new Set()),
    };
    const result = matcher.match([part(10, 'haga_revisitas', 'A')], persons, history);

    expect(result.assignments).toHaveLength(2);
    expect(result.unassigned).toHaveLength(0);
  });
});
