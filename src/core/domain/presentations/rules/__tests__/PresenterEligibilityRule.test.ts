import { describe, it, expect } from 'vitest';
import { PresenterEligibilityRule } from '../PresenterEligibilityRule';
import { AssignmentEngineState, HistoryView, ScoringContext } from '../../types';
import { AssignablePerson, Cargo } from '@/domain/entities/presentation/AssignablePerson';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import { Genero, PresentationType } from '@/domain/entities/presentation/enums';

function person(id: number, genero: Genero | null, cargo: Cargo | null = null): AssignablePerson {
  return new AssignablePerson(id, `N${id}`, `A${id}`, genero, cargo, null);
}

function part(id: number, tipo: PresentationType): PresentationPart {
  return new PresentationPart(id, 100, 1, tipo, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1));
}

function emptyHistory(): HistoryView {
  return {
    pairedWithWithin6mo: () => new Set(),
    tipoHistoryWithin6mo: () => new Set(),
    rolHistoryWithin6mo: () => new Set(),
  };
}

function ctx(candidate: AssignablePerson, tipo: PresentationType, role: ScoringContext['role'] = 'presentador'): ScoringContext {
  return {
    person: candidate,
    part: part(candidate.id_usuario, tipo),
    role,
    weekState: { byPart: new Map(), assignedPersonIds: new Set() } as AssignmentEngineState,
    history: emptyHistory(),
    personsById: new Map([[candidate.id_usuario, candidate]]),
  };
}

describe('PresenterEligibilityRule (R1 cargo + R3 gender data-driven)', () => {
  const rule = new PresenterEligibilityRule();

  it.each([
    ['que_diria allows an anciano', 1, 'que_diria' as const, 'masculino' as const, 'anciano' as const, true],
    ['que_diria allows a siervo', 2, 'que_diria' as const, 'femenino' as const, 'siervo' as const, true],
    ['que_diria blocks a publicador (NULL cargo)', 3, 'que_diria' as const, 'masculino' as const, null, false],
    ['que_diria is gender-neutral', 4, 'que_diria' as const, 'femenino' as const, null, false],
    ['lectura allows an anciano', 5, 'lectura_biblia' as const, 'masculino' as const, 'anciano' as const, true],
    ['lectura allows a publicador (no cargo restriction)', 6, 'lectura_biblia' as const, 'masculino' as const, null, true],
    ['lectura blocks femenino', 7, 'lectura_biblia' as const, 'femenino' as const, null, false],
    ['discurso allows a masculino', 8, 'discurso' as const, 'masculino' as const, null, true],
    ['discurso blocks femenino', 9, 'discurso' as const, 'femenino' as const, null, false],
  ])('%s', (_label, id: number, tipo: PresentationType, genero: Genero | null, cargo: Cargo | null, expected: boolean) => {
    expect(rule.isAllowed(ctx(person(id, genero, cargo), tipo))).toBe(expected);
  });

  it('does not restrict gender or cargo on an any_gender / any_cargo two-person part', () => {
    for (const role of ['presentador', 'companero'] as const) {
      expect(rule.isAllowed(ctx(person(1, 'femenino', null), 'empiece_conversaciones', role))).toBe(true);
      expect(rule.isAllowed(ctx(person(2, 'masculino', 'anciano'), 'empiece_conversaciones', role))).toBe(true);
      expect(rule.isAllowed(ctx(person(3, 'femenino', 'siervo'), 'escenificacion', role))).toBe(true);
    }
  });

  it('contributes zero to soft ranking', () => {
    expect(rule.score(ctx(person(1, 'masculino', null), 'lectura_biblia'))).toBe(0);
  });
});