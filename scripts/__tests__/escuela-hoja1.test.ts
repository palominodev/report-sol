import { describe, it, expect } from 'vitest';
import {
  splitCsvLines, monthFromHeader, parseWeekStart, labelToSchoolTipo,
  looksLikeSchoolLabel, findWeekBlocks, extractBlockSlots, formatWeekLabel,
} from '../lib/escuela-hoja1';

/** Build a row of `n` empty cells with the given cells set by index. */
function row(n: number, cells: Record<number, string>): string[] {
  const r = Array.from({ length: n }, () => '');
  for (const [i, v] of Object.entries(cells)) r[Number(i)] = v;
  return r;
}

describe('splitCsvLines', () => {
  it('keeps blank rows so row indexes stay stable', () => {
    const rows = splitCsvLines('a,b\n\n,,\nc,"d,e"\r\n');
    expect(rows[0]).toEqual(['a', 'b']);
    expect(rows[1]).toEqual(['']);
    expect(rows[2]).toEqual(['', '', '']);
    expect(rows[3]).toEqual(['c', 'd,e']);
  });
  it('treats doubled quotes like parseCsv (toggle, quotes dropped)', () => {
    expect(splitCsvLines('"Acuérdate de ""la Roca""",X')[0]).toEqual(['Acuérdate de la Roca', 'X']);
  });
});

describe('monthFromHeader', () => {
  it('accepts case/spacing/spelling variants', () => {
    expect(monthFromHeader('ENERO ')).toBe(1);
    expect(monthFromHeader('Agosto')).toBe(8);
    expect(monthFromHeader('SETIEMBRE')).toBe(9);
    expect(monthFromHeader('septiembre')).toBe(9);
    expect(monthFromHeader('DICIEMBRE')).toBe(12);
  });
  it('rejects non-month cells', () => {
    expect(monthFromHeader('Presidente')).toBeNull();
    expect(monthFromHeader('')).toBeNull();
    expect(monthFromHeader('Semana del 5 al 11')).toBeNull();
  });
});

describe('parseWeekStart', () => {
  it('uses the first number and the section month', () => {
    expect(parseWeekStart('Semana del 5 al 11', 1, 2026)).toBe('2026-01-05');
    expect(parseWeekStart('Semana de 6 al 12', 7, 2026)).toBe('2026-07-06');
    expect(parseWeekStart('Semana del 26 al 1 de Febrero', 1, 2026)).toBe('2026-01-26');
    expect(parseWeekStart('Semana del 29 al 05 Julio', 6, 2026)).toBe('2026-06-29');
    expect(parseWeekStart('Semana 28 Set al 4 Oct.', 9, 2026)).toBe('2026-09-28');
  });
  it('throws when the date is not a Monday', () => {
    expect(() => parseWeekStart('Semana del 6 al 12', 1, 2026)).toThrow(/lunes|Monday/i);
  });
  it('throws when there is no number', () => {
    expect(() => parseWeekStart('Semana', 1, 2026)).toThrow();
  });
});

describe('formatWeekLabel', () => {
  it('same-month and cross-month Spanish labels', () => {
    expect(formatWeekLabel('2026-01-05')).toBe('5-11 de enero');
    expect(formatWeekLabel('2026-01-26')).toBe('26 de enero a 1 de febrero');
    expect(formatWeekLabel('2026-07-27')).toBe('27 de julio a 2 de agosto');
    expect(formatWeekLabel('2026-08-31')).toBe('31 de agosto a 6 de septiembre');
  });
});

describe('labelToSchoolTipo', () => {
  const cases: Array<[string, string]> = [
    ['Lectura', 'lectura_biblia'], ['Lectura:', 'lectura_biblia'], ['Letura', 'lectura_biblia'], ['Letura:', 'lectura_biblia'],
    ['Empiece conversaciones', 'empiece_conversaciones'], ['Empiece Conversaciones ', 'empiece_conversaciones'],
    ['Empiece conversdaciones', 'empiece_conversaciones'], ['Empiece  conversaciones', 'empiece_conversaciones'],
    ['Empecemos conversaciones', 'empiece_conversaciones'],
    ['Haga revisitas', 'haga_revisitas'], ['Haga revisita', 'haga_revisitas'], ['Haga revistas ', 'haga_revisitas'],
    ['Hga revisitas', 'haga_revisitas'], ['Hagamos revisitas', 'haga_revisitas'], ['HYagamos revisitas', 'haga_revisitas'],
    ['Haga discípulos', 'haga_discipulos'], ['Haga discipulos', 'haga_discipulos'], ['Hagamos discípulos', 'haga_discipulos'],
    ['Discurso', 'discurso'], ['Disurso', 'discurso'], ['Discurso:', 'discurso'],
    ['Explique sus creencias', 'explique_sus_creencias'], ['Explique sus creencias (D)', 'explique_sus_creencias'],
    ['Explique sus creencias (Escenificación)', 'explique_sus_creencias'], ['Explique sus creencia ', 'explique_sus_creencias'],
    ['Expliquemos nuestras creencias', 'explique_sus_creencias'],
    ['¿Qué diría?', 'que_diria'],
  ];
  it.each(cases)('%s → %s', (label, tipo) => {
    expect(labelToSchoolTipo(label)).toBe(tipo);
  });
  it('maps non-school labels to SKIP and empty to null', () => {
    for (const l of ['Presidente', 'Presidente : Diomar Tamani', 'Tesoros', 'Busquemos perlas', 'Estudio de congregación',
      'Lector', 'Oración:', 'Necesidades de la congregación', 'Nesecidades', 'Informe de servicio', 'Campaña', 'Auxiliar : X']) {
      expect(labelToSchoolTipo(l)).toBe('SKIP');
    }
    expect(labelToSchoolTipo('')).toBeNull();
    expect(labelToSchoolTipo('  ')).toBeNull();
  });
});

describe('looksLikeSchoolLabel', () => {
  it('flags school-ish labels but not clear non-school ones', () => {
    expect(looksLikeSchoolLabel('Hagan revisitas')).toBe(true);
    expect(looksLikeSchoolLabel('Lecturaa')).toBe(true);
    expect(looksLikeSchoolLabel('Presidente')).toBe(false);
    expect(looksLikeSchoolLabel('Tesoros')).toBe(false);
  });
});

describe('findWeekBlocks (staggered headers)', () => {
  // Month header, then block A header at row 2 (col 0), block B header at row 3 (col 6)
  const rows: string[][] = [
    row(12, { 0: 'ABRIL' }),
    row(12, {}),
    row(12, { 0: 'Semana del 6 al 12' }),
    row(12, { 0: 'Presidente', 1: 'P1', 6: 'Semana del 13 al 19' }),
    row(12, { 0: 'Lectura', 1: 'Ana Lopez', 3: 'Lectura', 4: 'Beto Ruiz', 6: 'Presidente', 7: 'P2' }),
    row(12, { 0: 'Empiece conversaciones', 1: 'Carla Diaz', 6: 'Lectura', 7: 'Dario Paz' }),
    row(12, { 1: 'Elena Soto', 7: '' }),
    row(12, { 0: 'MAYO' }),
    row(12, { 0: 'Semana del 4 al 10' }),
  ];
  const blocks = findWeekBlocks(rows, 2026);

  it('derives each block start row from its own header cell', () => {
    expect(blocks.map((b) => [b.start, b.col, b.headerRow, b.firstRow, b.lastRow])).toEqual([
      ['2026-04-06', 0, 2, 3, 6],
      ['2026-04-13', 6, 3, 4, 6],
      ['2026-05-04', 0, 8, 9, 8],
    ]);
  });

  it('extracts slots per block with side and companion', () => {
    const a = extractBlockSlots(rows, blocks[0]);
    expect(a.slots).toEqual([
      { tipo: 'lectura_biblia', presentador: 'Ana Lopez', companero: undefined, side: 0 },
      { tipo: 'lectura_biblia', presentador: 'Beto Ruiz', companero: undefined, side: 1 },
      { tipo: 'empiece_conversaciones', presentador: 'Carla Diaz', companero: 'Elena Soto', side: 0 },
    ]);
    const b = extractBlockSlots(rows, blocks[1]);
    expect(b.slots).toEqual([{ tipo: 'lectura_biblia', presentador: 'Dario Paz', companero: undefined, side: 0 }]);
  });

  it('throws when a Semana cell appears before any month header', () => {
    expect(() => findWeekBlocks([row(6, { 0: 'Semana del 5 al 11' })], 2026)).toThrow();
  });
});

describe('extractBlockSlots rules', () => {
  const mk = (cells: Array<Record<number, string>>) => {
    const rows = [row(6, { 0: 'ENERO' }), row(6, { 0: 'Semana del 5 al 11' }), ...cells.map((c) => row(6, c))];
    const [blk] = findWeekBlocks(rows, 2026);
    return extractBlockSlots(rows, blk);
  };

  it('detects the companion under an "(Escenificación)" label', () => {
    const r = mk([
      { 0: 'Explique sus creencias', 1: 'Gerardo Castillo' },
      { 0: '(Escenificación)', 1: 'Isaac Orbe' },
    ]);
    expect(r.slots).toEqual([{ tipo: 'explique_sus_creencias', presentador: 'Gerardo Castillo', companero: 'Isaac Orbe', side: 0 }]);
  });

  it('does not take a companion from a row with another label', () => {
    const r = mk([
      { 0: 'Discurso', 1: 'Ricardo Chimoy' },
      { 0: 'Título del discurso', 1: 'Bryan Avilés' },
    ]);
    expect(r.slots).toHaveLength(1);
    expect(r.slots[0].companero).toBeUndefined();
  });

  it('drops "?????" names and reports them', () => {
    const r = mk([{ 0: 'Lectura', 1: '?????' }, { 0: 'Lectura:', 1: 'Pedro Gil' }]);
    expect(r.slots.map((s) => s.presentador)).toEqual(['Pedro Gil']);
    expect(r.dropped.map((d) => d.name)).toEqual(['?????']);
  });

  it('drops event names', () => {
    const r = mk([{ 0: 'Lectura', 1: 'Visita del Circuito' }, { 0: 'Discurso', 1: 'Asamblea Regional' }]);
    expect(r.slots).toEqual([]);
  });

  it('ignores "Presidente : X" text in the right-hand pair and non-school names', () => {
    const r = mk([
      { 0: 'Tesoros', 1: 'Luis Fernández', 3: 'Presidente : Diomar Tamani' },
      { 0: 'Oración', 1: 'Oscar Valeriano' },
    ]);
    expect(r.slots).toEqual([]);
  });

  it('collects school-looking labels that were not mapped', () => {
    const r = mk([{ 0: 'Hagan revisitas', 1: 'Pedro Gil' }]);
    expect(r.slots).toEqual([]);
    expect(r.unmapped.map((u) => u.label)).toEqual(['Hagan revisitas']);
  });

  it('keeps row-major interleave order (side 0 first within a row)', () => {
    const r = mk([
      { 0: 'Lectura', 1: 'Ana Lopez', 3: 'Lectura', 4: 'Beto Ruiz' },
      { 0: 'Discurso', 1: 'Carla Diaz', 3: 'Discurso', 4: 'Dario Paz' },
    ]);
    expect(r.slots.map((s) => `${s.side}:${s.presentador}`)).toEqual(['0:Ana Lopez', '1:Beto Ruiz', '0:Carla Diaz', '1:Dario Paz']);
  });
});
