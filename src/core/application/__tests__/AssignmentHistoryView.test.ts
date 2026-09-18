import { describe, it, expect } from 'vitest';
import { AssignmentHistoryView } from '../use-cases/presentation/AssignmentHistoryView';
import { AssignmentHistoryRow } from '@/core/domain/presentations/types';
import { historyWindowStart, HISTORY_WINDOW_WEEKS } from '../use-cases/presentation/history-window';
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

  describe('salaPartnerCombos (joint sala+partner feed)', () => {
    it('groups rows by part: each participant gets sala#partner from the other-rol row', () => {
      const view = new AssignmentHistoryView([
        row(1, 10, 1, 'presentador', 'haga_revisitas', 'A'),
        row(1, 10, 2, 'companero', 'haga_revisitas', 'A'),
      ]);

      expect(view.salaPartnerCombos(1)).toEqual(new Set(['A#2']));
      expect(view.salaPartnerCombos(2)).toEqual(new Set(['A#1']));
    });

    it('is rol-independent: a prior participation as presentador feeds the combos too', () => {
      const view = new AssignmentHistoryView([
        row(1, 10, 1, 'presentador', 'explique_sus_creencias', 'B'),
        row(1, 10, 2, 'companero', 'explique_sus_creencias', 'B'),
      ]);

      expect(view.salaPartnerCombos(2)).toEqual(new Set(['B#1']));
    });

    it('keeps separate keys per sala and per partner across parts', () => {
      const view = new AssignmentHistoryView([
        row(1, 10, 1, 'presentador', 'haga_revisitas', 'A'),
        row(1, 10, 2, 'companero', 'haga_revisitas', 'A'),
        row(2, 11, 1, 'presentador', 'haga_discipulos', 'A'),
        row(2, 11, 3, 'companero', 'haga_discipulos', 'A'),
        row(3, 12, 1, 'presentador', 'empiece_conversaciones', 'B'),
        row(3, 12, 2, 'companero', 'empiece_conversaciones', 'B'),
      ]);

      expect(view.salaPartnerCombos(1)).toEqual(new Set(['A#2', 'A#3', 'B#2']));
    });

    it('skips rows whose part has NULL sala', () => {
      const view = new AssignmentHistoryView([
        row(1, 10, 1, 'presentador', 'haga_revisitas', null),
        row(1, 10, 2, 'companero', 'haga_revisitas', null),
        row(2, 11, 1, 'presentador', 'haga_revisitas', 'B'),
        row(2, 11, 2, 'companero', 'haga_revisitas', 'B'),
      ]);

      expect(view.salaPartnerCombos(1)).toEqual(new Set(['B#2']));
    });

    it('skips single-person parts: a lone participant has no partner identity', () => {
      const view = new AssignmentHistoryView([
        row(1, 10, 1, 'presentador', 'lectura_biblia', 'A'),
      ]);

      expect(view.salaPartnerCombos(1)).toEqual(new Set());
    });

    it('returns an empty set for a person with no in-window rows', () => {
      const view = new AssignmentHistoryView([
        row(1, 10, 1, 'presentador', 'haga_revisitas', 'A'),
        row(1, 10, 2, 'companero', 'haga_revisitas', 'A'),
      ]);

      expect(view.salaPartnerCombos(99)).toEqual(new Set());
    });
  });

  describe('26-week history window boundary', () => {
    /**
     * The view is fed rows already windowed by the repository query
     * (`fecha >= desde`), so the boundary is proven against the shared
     * helper the query uses, with dated row fixtures.
     */
    function rowAtWeeksAgo(idPart: number, weeks: number): { id_part: number; fecha: string } {
      const d = new Date();
      d.setDate(d.getDate() - weeks * 7);
      return { id_part: idPart, fecha: d.toISOString().slice(0, 10) };
    }

    it('cuts at exactly 26 weeks: only participations at 25w are in view, 27w are out', () => {
      expect(HISTORY_WINDOW_WEEKS).toBe(26);
      const desde = historyWindowStart();
      const inWindow = rowAtWeeksAgo(1, 25);
      const outOfWindow = rowAtWeeksAgo(2, 27);

      expect(inWindow.fecha >= desde).toBe(true);
      expect(outOfWindow.fecha >= desde).toBe(false);
    });
  });
});