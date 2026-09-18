import { describe, it, expect } from 'vitest';
import { PairPolicyRule } from '../PairPolicyRule';
import { AssignmentEngineState, HistoryView, ScoringContext } from '../../types';
import { AssignablePerson, Cargo } from '@/domain/entities/presentation/AssignablePerson';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import { Genero, PresentationType } from '@/domain/entities/presentation/enums';

function person(
  id: number,
  genero: Genero | null,
  familiaId: number | null = null,
  cargo: Cargo | null = null
): AssignablePerson {
  return new AssignablePerson(id, `N${id}`, `A${id}`, genero, cargo, familiaId);
}

function part(id: number, tipo: PresentationType): PresentationPart {
  return new PresentationPart(id, 100, 1, tipo, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1));
}

function emptyHistory(): HistoryView {
  return {
    pairedWithWithin6mo: () => new Set(),
    tipoHistoryWithin6mo: () => new Set(),
    rolHistoryWithin6mo: () => new Set(),
    salaPartnerCombos: () => new Set(),
  };
}

/**
 * Companion-time context: the candidate (`companion`) evaluates against the
 * already-committed presenter for the same part, resolved via personsById.
 */
function companionCtx(
  companion: AssignablePerson,
  presenter: AssignablePerson | null,
  tipo: PresentationType
): ScoringContext {
  const persons = presenter ? [companion, presenter] : [companion];
  return {
    person: companion,
    part: part(100, tipo),
    role: 'companero',
    weekState: {
      byPart: new Map(presenter ? [[100, [presenter.id_usuario]]] : []),
      assignedPersonIds: new Set(presenter ? [presenter.id_usuario] : []),
    } as AssignmentEngineState,
    history: emptyHistory(),
    personsById: new Map(persons.map((p) => [p.id_usuario, p])),
  };
}

describe('PairPolicyRule (R2 per-tipo pair policy)', () => {
  const rule = new PairPolicyRule();

  describe('mixed_iff_same_familia (empiece_conversaciones, explique_sus_creencias)', () => {
    it('allows a mixed pair when both share the same non-null familia_id', () => {
      const candidate = person(2, 'femenino', 7);
      const presenter = person(1, 'masculino', 7);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'empiece_conversaciones'))).toBe(true);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'explique_sus_creencias'))).toBe(true);
    });

    it('blocks a mixed pair when either familia_id is NULL (NULL = not family)', () => {
      const candidate = person(2, 'femenino', null);
      const presenter = person(1, 'masculino', 7);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'empiece_conversaciones'))).toBe(false);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'explique_sus_creencias'))).toBe(false);
    });

    it('blocks a mixed pair from different families', () => {
      const candidate = person(2, 'femenino', 8);
      const presenter = person(1, 'masculino', 7);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'empiece_conversaciones'))).toBe(false);
    });
  });

  describe('never_mixed (haga_revisitas, haga_discipulos)', () => {
    it('blocks a mixed pair even when both share the same non-null familia_id', () => {
      const candidate = person(2, 'femenino', 7);
      const presenter = person(1, 'masculino', 7);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'haga_revisitas'))).toBe(false);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'haga_discipulos'))).toBe(false);
    });

    it('always allows same-gender pairs', () => {
      const candidate = person(2, 'masculino', null);
      const presenter = person(1, 'masculino', null);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'haga_revisitas'))).toBe(true);
      expect(rule.isAllowed(companionCtx(candidate, presenter, 'haga_discipulos'))).toBe(true);
    });
  });

  describe('defensive edges', () => {
    it('allows when no presenter has been committed yet (presenter slot, single-person part)', () => {
      const candidate = person(2, 'femenino');
      expect(rule.isAllowed(companionCtx(candidate, null, 'haga_revisitas'))).toBe(true);
    });

    it('allows when the committed co-person is not resolvable in personsById', () => {
      const candidate = person(2, 'femenino', 7);
      const ctx: ScoringContext = {
        person: candidate,
        part: part(100, 'empiece_conversaciones'),
        role: 'companero',
        // Presenter 999 committed on the part but ABSENT from personsById.
        weekState: { byPart: new Map([[100, [999]]]), assignedPersonIds: new Set([999]) } as AssignmentEngineState,
        history: emptyHistory(),
        personsById: new Map([[candidate.id_usuario, candidate]]),
      };
      expect(rule.isAllowed(ctx)).toBe(true);
    });

    it('is a no-op on one-person parts (pair: none)', () => {
      expect(rule.isAllowed(companionCtx(person(2, 'femenino'), person(1, 'masculino'), 'que_diria'))).toBe(true);
      expect(rule.isAllowed(companionCtx(person(2, 'femenino'), person(1, 'masculino'), 'lectura_biblia'))).toBe(true);
      expect(rule.isAllowed(companionCtx(person(2, 'femenino'), person(1, 'masculino'), 'discurso'))).toBe(true);
    });
  });

  it('contributes zero to soft ranking', () => {
    expect(rule.score(companionCtx(person(1, 'masculino'), person(2, 'femenino', 7), 'empiece_conversaciones'))).toBe(0);
  });
});