import { describe, expect, it } from 'vitest';
import { computeSlotCoverage, describeMissingSlots } from '../missingSlots';

const single = (id_part: number) => ({ id_part, requiresCompanero: () => false });
const pair = (id_part: number) => ({ id_part, requiresCompanero: () => true });

const part = (id_part: number, orden: number, tipo: string, sala: 'A' | 'B' | null) => ({ id_part, orden, tipo, sala });

describe('describeMissingSlots', () => {
  it('names the role, the part and the room', () => {
    const labels = describeMissingSlots(
      [part(16, 4, 'haga_revisitas', 'A')],
      [{ id_part: 16, rol: 'presentador' }]
    );
    expect(labels).toEqual(['Falta presentador en «Haga revisitas» (Sala A (Principal))']);
  });

  it('uses "compañero" for the companero role and omits the room when unknown', () => {
    const labels = describeMissingSlots(
      [part(5, 1, 'haga_revisitas', null)],
      [{ id_part: 5, rol: 'companero' }]
    );
    expect(labels).toEqual(['Falta compañero en «Haga revisitas»']);
  });

  it('tells apart two parts of the same type in the same room, in on-screen order', () => {
    const labels = describeMissingSlots(
      [part(15, 3, 'empiece_conversaciones', 'A'), part(14, 2, 'empiece_conversaciones', 'A')],
      [
        { id_part: 14, rol: 'presentador' },
        { id_part: 15, rol: 'presentador' },
      ]
    );
    expect(labels).toEqual([
      'Falta presentador en «Empiece conversaciones» n.º 1 (Sala A (Principal))',
      'Falta presentador en «Empiece conversaciones» n.º 2 (Sala A (Principal))',
    ]);
  });

  it('does not number a part whose type is unique in its room', () => {
    const labels = describeMissingSlots(
      [part(14, 2, 'empiece_conversaciones', 'A'), part(492, 2, 'empiece_conversaciones', 'B')],
      [{ id_part: 492, rol: 'presentador' }]
    );
    expect(labels).toEqual(['Falta presentador en «Empiece conversaciones» (Sala B (Auxiliar))']);
  });

  it('returns unique labels for every missing slot', () => {
    const parts = [part(14, 2, 'empiece_conversaciones', 'A'), part(15, 3, 'empiece_conversaciones', 'A')];
    const missing = [
      { id_part: 14, rol: 'presentador' as const },
      { id_part: 14, rol: 'companero' as const },
      { id_part: 15, rol: 'presentador' as const },
      { id_part: 15, rol: 'companero' as const },
    ];
    const labels = describeMissingSlots(parts, missing);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('computeSlotCoverage', () => {
  it('reports nothing missing when every required role is covered', () => {
    const result = computeSlotCoverage(
      [single(1), pair(2)],
      [
        { id_part: 1, rol: 'presentador' },
        { id_part: 2, rol: 'presentador' },
        { id_part: 2, rol: 'companero' },
      ]
    );
    expect(result.missing).toEqual([]);
    expect(result.total).toBe(3);
    expect(result.assigned).toBe(3);
  });

  it('requires two slots for a part with companero', () => {
    const result = computeSlotCoverage([pair(2)], []);
    expect(result.total).toBe(2);
    expect(result.missing).toEqual([
      { id_part: 2, rol: 'presentador' },
      { id_part: 2, rol: 'companero' },
    ]);
  });

  it('requires one slot for a part without companero', () => {
    const result = computeSlotCoverage([single(1)], []);
    expect(result.total).toBe(1);
    expect(result.missing).toEqual([{ id_part: 1, rol: 'presentador' }]);
  });

  it('handles partially assigned parts', () => {
    const result = computeSlotCoverage(
      [single(1), pair(2)],
      [
        { id_part: 1, rol: 'presentador' },
        { id_part: 2, rol: 'presentador' },
      ]
    );
    expect(result.total).toBe(3);
    expect(result.assigned).toBe(2);
    expect(result.missing).toEqual([{ id_part: 2, rol: 'companero' }]);
  });

  it('treats everything as missing when there are no assignments', () => {
    const result = computeSlotCoverage([single(1), pair(2)], []);
    expect(result.assigned).toBe(0);
    expect(result.missing).toHaveLength(3);
  });

  it('ignores a companero row on a part that does not need one', () => {
    const result = computeSlotCoverage([single(1)], [{ id_part: 1, rol: 'companero' }]);
    expect(result.missing).toEqual([{ id_part: 1, rol: 'presentador' }]);
    expect(result.assigned).toBe(0);
  });

  it('ignores assignments for other parts', () => {
    const result = computeSlotCoverage([single(1)], [{ id_part: 99, rol: 'presentador' }]);
    expect(result.assigned).toBe(0);
    expect(result.missing).toEqual([{ id_part: 1, rol: 'presentador' }]);
  });

  it('does not mutate its inputs', () => {
    const parts = [single(1), pair(2)];
    const assignments = [{ id_part: 1, rol: 'presentador' as const }];
    const partsCopy = [...parts];
    const assignmentsCopy = assignments.map((a) => ({ ...a }));
    computeSlotCoverage(parts, assignments);
    expect(parts).toEqual(partsCopy);
    expect(assignments).toEqual(assignmentsCopy);
  });
});
