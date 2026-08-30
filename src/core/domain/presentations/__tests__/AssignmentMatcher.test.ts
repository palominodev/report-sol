import { describe, it, expect } from 'vitest';
import { AssignmentMatcher } from '../AssignmentMatcher';
import { RuleRegistry } from '../RuleRegistry';
import { NoRepeatPairWithin6MonthsRule } from '../NoRepeatPairWithin6MonthsRule';
import { MatchingRule, HistoryView } from '../types';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import { Genero } from '@/domain/entities/presentation/enums';

function person(
  id: number,
  genero: Genero | null,
  cargo: AssignablePerson['cargo'] = null,
  familiaId: number | null = null
): AssignablePerson {
  return new AssignablePerson(id, `Nombre${id}`, `Apellido${id}`, genero, cargo, familiaId);
}

function part(id: number, idWeek: number, orden: number, requiresCompanero = true): PresentationPart {
  const tipo = requiresCompanero ? 'empiece_conversaciones' : 'lectura_biblia';
  return new PresentationPart(id, idWeek, orden, tipo, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1));
}

function historyOf(map: Record<number, number[]>): HistoryView {
  return {
    pairedWithWithin6mo: (id) => new Set(map[id] ?? []),
    tipoHistoryWithin6mo: () => new Set(),
    rolHistoryWithin6mo: () => new Set(),
  };
}

function buildMatcher(): { matcher: AssignmentMatcher } {
  const registry = new RuleRegistry();
  registry.register(new NoRepeatPairWithin6MonthsRule());
  return { matcher: new AssignmentMatcher(registry) };
}

/** Registry whose hard gate excludes a fixed set of persons (routing probe). */
function buildMatcherWithHardGate(blockedIds: Set<number>): { matcher: AssignmentMatcher } {
  const registry = new RuleRegistry();
  registry.register(new NoRepeatPairWithin6MonthsRule());
  registry.register({
    id: 'test_hard_block',
    isAllowed: (ctx) => !blockedIds.has(ctx.person.id_usuario),
    score: () => 0,
  } satisfies MatchingRule);
  return { matcher: new AssignmentMatcher(registry) };
}

describe('AssignmentMatcher', () => {
  it('is deterministic: same inputs produce the same output on repeated runs', () => {
    const persons = [person(1, 'masculino'), person(2, 'femenino'), person(3, 'masculino'), person(4, 'femenino')];
    const parts = [part(10, 100, 1, true), part(11, 100, 2, true)];
    const history = historyOf({});
    const { matcher } = buildMatcher();

    const first = matcher.match(parts, persons, history);
    const second = matcher.match(parts, persons, history);

    expect(first.assignments).toEqual(second.assignments);
    expect(first.unassigned).toEqual(second.unassigned);
  });

  it('skips usuarios with NULL genero and never references them in assignments', () => {
    // M+F pair on empiece_conversaciones: same familia so the mixed path stays
    // legal once the pair-policy rule joins the registry (2.5).
    const persons = [
      person(1, 'masculino', null, 7),
      person(2, null),
      person(3, 'femenino', null, 7),
    ];
    const parts = [part(10, 100, 1, true)];
    const { matcher } = buildMatcher();

    const result = matcher.match(parts, persons, historyOf({}));

    expect(result.assignments).toHaveLength(2); // presenter + companion both filled by eligible users
    expect(result.assignments.some((a) => a.id_usuario === 2)).toBe(false);
  });

  it('never assigns the same person to more than one part in the same week (double-book impossible)', () => {
    const persons = [
      person(1, 'masculino', null, 7),
      person(2, 'femenino', null, 7),
      person(3, 'masculino'),
    ];
    const parts = [part(10, 100, 1, true), part(11, 100, 2, true)]; // 4 slots, only 3 people
    const { matcher } = buildMatcher();

    const result = matcher.match(parts, persons, historyOf({}));

    const counts = new Map<number, number>();
    for (const a of result.assignments) {
      counts.set(a.id_usuario, (counts.get(a.id_usuario) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBe(1);
    }
    expect(result.unassigned.length).toBeGreaterThan(0); // cannot fill 4 slots with 3 people
  });

  it('keeps presenter and companion distinct on a two-person part', () => {
    const persons = [
      person(1, 'masculino', null, 7),
      person(2, 'femenino', null, 7),
      person(3, 'masculino'),
    ];
    const parts = [part(10, 100, 1, true)];
    const { matcher } = buildMatcher();

    const result = matcher.match(parts, persons, historyOf({}));

    expect(result.assignments).toHaveLength(2);
    const presenter = result.assignments.find((a) => a.rol === 'presentador')!;
    const companion = result.assignments.find((a) => a.rol === 'companero')!;
    expect(presenter.id_usuario).not.toBe(companion.id_usuario);
  });

  it('avoids pairing two people who were paired within the last 6 months', () => {
    const persons = [person(1, 'masculino'), person(2, 'masculino'), person(3, 'masculino')];
    const parts = [part(10, 100, 1, true)];
    // Users 1 and 2 were paired recently; user 3 is a fresh option.
    const history = historyOf({ 1: [2] });
    const { matcher } = buildMatcher();

    const result = matcher.match(parts, persons, history);

    expect(result.assignments).toHaveLength(2);
    const companion = result.assignments.find((a) => a.rol === 'companero')!;
    expect(companion.id_usuario).toBe(3); // user 3 chosen over the recent pair (1,2)
  });

  it('collects unassigned slots when there are not enough eligible candidates', () => {
    const persons = [person(1, 'masculino')];
    const parts = [part(10, 100, 1, true)];
    const { matcher } = buildMatcher();

    const result = matcher.match(parts, persons, historyOf({}));

    expect(result.assignments).toHaveLength(0);
    // The part can never be atomically filled, so only the unresolved presenter
    // slot is reported as unassigned (a lone companion would be invalid).
    const roles = result.unassigned.map((u) => u.role);
    expect(roles).toEqual(['presentador']);
    // A candidate existed but no single one kept the part feasible.
    expect(result.unassigned).toEqual([
      { part: parts[0], role: 'presentador', reason: 'no_feasible_candidate' },
    ]);
  });

  it('excludes candidates rejected by a hard rule before any scoring happens', () => {
    const persons = [person(1, 'masculino'), person(2, 'masculino'), person(3, 'masculino')];
    const parts = [part(10, 100, 1, true)];
    const { matcher } = buildMatcherWithHardGate(new Set([2]));

    const result = matcher.match(parts, persons, historyOf({}));

    // With ids 1 and 3 gated-in, the deterministic pick is 1 as presenter and 3
    // as companion; person 2 must never appear even though scores tie at 0.
    const assignedIds = result.assignments.map((a) => a.id_usuario).sort((a, b) => a - b);
    expect(assignedIds).toEqual([1, 3]);
    expect(result.unassigned).toHaveLength(0);
  });

  it("emits 'no_eligible_candidate' when every candidate fails a hard rule", () => {
    const persons = [person(1, 'masculino'), person(2, 'masculino')];
    const parts = [part(10, 100, 1, true)];
    const { matcher } = buildMatcherWithHardGate(new Set([1, 2]));

    const result = matcher.match(parts, persons, historyOf({}));

    expect(result.assignments).toHaveLength(0);
    expect(result.unassigned).toEqual([
      { part: parts[0], role: 'presentador', reason: 'no_eligible_candidate' },
    ]);
  });

  it('treats soft-only rules as fully allowed (isAllowed defaults to true)', () => {
    // Registry contains only R5, which defines no gate: every candidate passes.
    const persons = [person(1, 'masculino'), person(2, 'femenino', null, 7)];
    const parts = [part(10, 100, 1, true)];
    const history = historyOf({ 1: [2] }); // recent pair would be penalized, not blocked
    const { matcher } = buildMatcher();

    const result = matcher.match(parts, persons, history);

    expect(result.assignments).toHaveLength(2);
    expect(result.unassigned).toHaveLength(0);
    const roles = new Set(result.assignments.map((a) => a.rol));
    expect(roles).toEqual(new Set(['presentador', 'companero']));
  });
});