import { describe, it, expect } from 'vitest';
import { AssignmentHistoryView } from '../use-cases/presentation/AssignmentHistoryView';
import { AssignmentHistoryRow } from '@/core/domain/presentations/types';
import type { Sala } from '@/domain/entities/presentation/enums';

function row(
  idPart: number,
  idWeek: number,
  idUsuario: number,
  rol: 'presentador' | 'companero',
  tipo: string,
  sala: Sala | null = null
): AssignmentHistoryRow {
  return { id_part: idPart, id_week: idWeek, id_usuario: idUsuario, rol, tipo: tipo as never, sala };
}

describe('AssignmentHistoryView', () => {
  it('reports the part tipos a person held within the window (R4 feed)', () => {
    const view = new AssignmentHistoryView([
      row(1, 10, 1, 'presentador', 'lectura_biblia'),
      row(2, 10, 1, 'presentador', 'discurso'),
      row(3, 11, 2, 'presentador', 'haga_revisitas'),
    ]);

    expect(view.tipoHistoryWithin6mo(1)).toEqual(new Set(['lectura_biblia', 'discurso']));
    expect(view.tipoHistoryWithin6mo(2)).toEqual(new Set(['haga_revisitas']));
  });

  it('reports the roles a person held within the window (R6 feed)', () => {
    const view = new AssignmentHistoryView([
      row(1, 10, 1, 'presentador', 'lectura_biblia'),
      row(2, 10, 1, 'companero', 'empiece_conversaciones'),
    ]);

    expect(view.rolHistoryWithin6mo(1)).toEqual(new Set(['presentador', 'companero']));
  });

  it('keeps reporting recent pairs (R5 regression)', () => {
    const view = new AssignmentHistoryView([
      row(1, 10, 1, 'presentador', 'lectura_biblia'),
      row(1, 10, 2, 'companero', 'lectura_biblia'),
    ]);

    expect(view.pairedWithWithin6mo(1)).toEqual(new Set([2]));
    expect(view.pairedWithWithin6mo(2)).toEqual(new Set([1]));
  });

  it('returns empty histories for a person with no rows in the window', () => {
    const view = new AssignmentHistoryView([row(1, 10, 1, 'presentador', 'lectura_biblia')]);

    expect(view.tipoHistoryWithin6mo(99)).toEqual(new Set());
    expect(view.rolHistoryWithin6mo(99)).toEqual(new Set());
    expect(view.pairedWithWithin6mo(99)).toEqual(new Set());
  });
});