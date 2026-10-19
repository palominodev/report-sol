import { norm, collapse, isEventName, type Slot, type Tipo } from './escuela-csv';

/**
 * Pure parser for the 2026 sections of "Escuela Vida Y Ministerio 2025 -
 * Hoja 1". Unlike the Hoja 2/3/4 parser in escuela-csv.ts, Hoja 1 has month
 * sections whose week headers are STAGGERED (not on a single row), so every
 * week block derives its own start row from its own "Semana ..." cell.
 *
 * No database access here. Consumer: scripts/import-escuela-hoja1-2026.ts.
 */

// ---------------------------------------------------------------------------
// CSV lines
// ---------------------------------------------------------------------------

/**
 * Quote-aware line splitter with the same quote rule as parseCsv() in
 * escuela-csv.ts (a `"` toggles quoted mode and is dropped), but blank lines
 * are KEPT so that rows[i] is always raw line i+1 of the file.
 */
export function splitCsvLines(text: string): string[][] {
  return text.split('\n').map((rawLine) => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}

// ---------------------------------------------------------------------------
// Months / dates
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** 1-12 when the cell is exactly a month name (case/spacing/'setiembre' tolerant), else null. */
export function monthFromHeader(cell: string): number | null {
  const n = norm(cell);
  if (!n) return null;
  if (n === 'setiembre') return 9;
  const i = MONTH_NAMES.indexOf(n);
  return i >= 0 ? i + 1 : null;
}

function isoDate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Week start (ISO date) from a header like 'Semana del 5 al 11',
 * 'Semana de 6 al 12' or 'Semana 28 Set al 4 Oct.': the first number in the
 * text, in the month of the enclosing section. Throws unless it is a Monday.
 */
export function parseWeekStart(text: string, month: number, year: number): string {
  const m = /\d+/.exec(text);
  if (!m) throw new Error(`Encabezado de semana sin número: "${text}"`);
  const day = Number(m[0]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new Error(`Fecha inválida en "${text}" (${year}-${month}-${day})`);
  }
  if (d.getUTCDay() !== 1) {
    throw new Error(`"${text}" → ${isoDate(year, month, day)} no es lunes (Monday)`);
  }
  return isoDate(year, month, day);
}

/** ISO date + n days (UTC, no DST surprises). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return isoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Spanish week label in the style of the scraped weeks: '5-11 de enero' / '26 de enero a 1 de febrero'. */
export function formatWeekLabel(start: string): string {
  const end = addDays(start, 6);
  const [, m1, d1] = start.split('-').map(Number);
  const [, m2, d2] = end.split('-').map(Number);
  if (m1 === m2) return `${d1}-${d2} de ${MONTH_NAMES[m1 - 1]}`;
  return `${d1} de ${MONTH_NAMES[m1 - 1]} a ${d2} de ${MONTH_NAMES[m2 - 1]}`;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

// Prefix keys (compared collapsed-vs-collapsed, like labelToTipo) including
// the typos found in Hoja 1.
const SCHOOL_LABELS: Array<[string[], Tipo]> = [
  [['lectura', 'letura'], 'lectura_biblia'],
  [['empiece conv', 'empecemos conv'], 'empiece_conversaciones'],
  [['haga revis', 'hga revis', 'hagamos revis', 'hyagamos revis'], 'haga_revisitas'],
  [['haga disc', 'hagamos disc'], 'haga_discipulos'],
  [['discurso', 'disurso'], 'discurso'],
  [['explique sus', 'expliquemos nuestras'], 'explique_sus_creencias'],
  [['que diria'], 'que_diria'],
];
// Known non-school labels; checked first (e.g. 'Discurso final' must not be a discurso).
const SKIP_LABELS = [
  'presidente', 'auxiliar', 'tesoros', 'busquemos perlas', 'estudio', 'lector', 'oracion',
  'necesidades', 'nesecidades', 'informe', 'campana', 'repaso', 'visita del circuito', 'asamblea',
  'discurso final', 'del pasado al presente', 'jehova', 'seamos adaptables',
  'obedecer es mejor', 'pasos para recuperarnos', 'joven confia', 'quien me toco',
  'conclusion',
];

function startsWithAny(collapsedLabel: string, keys: string[]): boolean {
  return keys.some((k) => collapsedLabel.startsWith(collapse(k)));
}

/** True when the label is explicitly known as a non-school row. */
export function isKnownSkipLabel(label: string): boolean {
  return startsWithAny(collapse(label), SKIP_LABELS);
}

/** Label → tipo; 'SKIP' for anything that is not a school slot; null for an empty label. */
export function labelToSchoolTipo(label: string): Tipo | 'SKIP' | null {
  const l = collapse(label);
  if (!l) return null;
  if (startsWithAny(l, SKIP_LABELS)) return 'SKIP';
  for (const [keys, tipo] of SCHOOL_LABELS) if (startsWithAny(l, keys)) return tipo;
  return 'SKIP';
}

const SCHOOL_LIKE_PREFIXES = ['lect', 'let', 'empi', 'empe', 'conversac', 'hag', 'hga', 'hyag', 'disc', 'disu', 'expli', 'que di', 'revis'];

/** Heuristic: the label starts like a school label (used to surface unmapped typos). */
export function looksLikeSchoolLabel(label: string): boolean {
  const l = norm(label);
  return l !== '' && SCHOOL_LIKE_PREFIXES.some((p) => l.startsWith(p));
}

// ---------------------------------------------------------------------------
// Week blocks
// ---------------------------------------------------------------------------

export interface WeekBlock {
  /** ISO Monday. */
  start: string;
  /** Header text as written in the CSV. */
  header: string;
  month: number;
  /** Column of the left salón label (right salón is col + 3). */
  col: number;
  headerRow: number;
  /** First content row (headerRow + 1). */
  firstRow: number;
  /** Last content row (inclusive); < firstRow when the block is empty. */
  lastRow: number;
}

/**
 * Locate every week block: a cell starting with 'Semana' at (row, col). The
 * month comes from the latest month-header row (col 0) at or above that row;
 * the content runs from the row below the header to the row before the next
 * 'Semana' cell in the same column or the next month-header row.
 */
export function findWeekBlocks(rows: string[][], year: number): WeekBlock[] {
  const monthRows: Array<{ row: number; month: number }> = [];
  rows.forEach((r, i) => {
    const m = monthFromHeader(r[0] ?? '');
    if (m !== null) monthRows.push({ row: i, month: m });
  });

  const headers: Array<{ row: number; col: number; text: string }> = [];
  rows.forEach((r, i) => r.forEach((cell, c) => {
    if (norm(cell).startsWith('semana')) headers.push({ row: i, col: c, text: cell });
  }));

  const blocks: WeekBlock[] = headers.map((h) => {
    const section = [...monthRows].reverse().find((mr) => mr.row <= h.row);
    if (!section) throw new Error(`Fila ${h.row + 1}: "${h.text}" antes de cualquier encabezado de mes`);
    const nextMonth = monthRows.find((mr) => mr.row > h.row);
    const nextSame = headers.find((o) => o.col === h.col && o.row > h.row);
    const limits = [rows.length, nextMonth ? nextMonth.row : rows.length, nextSame ? nextSame.row : rows.length];
    return {
      start: parseWeekStart(h.text, section.month, year),
      header: h.text,
      month: section.month,
      col: h.col,
      headerRow: h.row,
      firstRow: h.row + 1,
      lastRow: Math.min(...limits) - 1,
    };
  });

  const seen = new Set<string>();
  for (const b of blocks) {
    if (seen.has(b.start)) throw new Error(`Semana duplicada ${b.start} ("${b.header}", fila ${b.headerRow + 1})`);
    seen.add(b.start);
  }
  return blocks.sort((a, b) => (a.start < b.start ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

export interface DroppedName { row: number; label: string; name: string; reason: string }
export interface UnmappedLabel { row: number; label: string }
export interface BlockSlots { slots: Slot[]; dropped: DroppedName[]; unmapped: UnmappedLabel[] }

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Same rules as extractSlots() in escuela-csv.ts, bounded to one block:
 * rows top to bottom, side 0 (cols c, c+1) then side 1 (cols c+3, c+4);
 * a companion is the name on the next row in the same pair when that row's
 * label is empty or starts with 'escenificacion'.
 */
export function extractBlockSlots(rows: string[][], block: WeekBlock): BlockSlots {
  const slots: Slot[] = [];
  const dropped: DroppedName[] = [];
  const unmapped: UnmappedLabel[] = [];

  for (let r = block.firstRow; r <= block.lastRow && r < rows.length; r++) {
    for (const side of [0, 1] as const) {
      const lc = block.col + (side === 0 ? 0 : 3);
      const label = rows[r][lc] ?? '';
      const name = rows[r][lc + 1] ?? '';
      const tipo = labelToSchoolTipo(label);
      if (tipo === null) continue;
      if (tipo === 'SKIP') {
        if (looksLikeSchoolLabel(label) && !isKnownSkipLabel(label)) unmapped.push({ row: r + 1, label: clean(label) });
        continue;
      }
      if (isEventName(name) || collapse(name).length < 4) {
        if (clean(name)) dropped.push({ row: r + 1, label: clean(label), name: clean(name), reason: isEventName(name) ? 'evento' : 'nombre inválido' });
        continue;
      }
      let companero: string | undefined;
      if (r + 1 <= block.lastRow && rows[r + 1]) {
        const nl = collapse(rows[r + 1][lc] ?? '');
        const nn = clean(rows[r + 1][lc + 1] ?? '');
        if ((nl === '' || nl.startsWith('escenificacion')) && nn && !isEventName(nn) && collapse(nn).length >= 4) {
          companero = nn;
        }
      }
      slots.push({ tipo, presentador: clean(name), companero, side });
    }
  }
  return { slots, dropped, unmapped };
}
