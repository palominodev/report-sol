import { readFileSync } from 'fs';

/**
 * Shared parser for the congregation's Escuela (Vida y Ministerio) CSV
 * sheets (Hoja 2/3/4 of "Escuela Vida Y Ministerio 2025").
 *
 * Layout: each sheet has week blocks of 6 columns; each block carries two
 * label/name column-pairs (two salones running the school in parallel).
 * A part's companero sits one row below, same column, with an empty or
 * "(Escenificación)" label.
 *
 * This module is pure CSV parsing — no database access. Consumers:
 * scripts/import-escuela-assignments.ts (assignments import) and
 * scripts/backfill-salas.ts (sala stamping replay).
 */

export type Tipo =
  | 'lectura_biblia' | 'empiece_conversaciones' | 'haga_revisitas'
  | 'haga_discipulos' | 'discurso' | 'que_diria' | 'explique_sus_creencias';

export interface WeekSpec {
  start: string;
  semana: string;
  create: boolean;
}

export interface SheetSpec {
  file: string;
  label: string;
  weeks: WeekSpec[];
}

export const SHEETS: SheetSpec[] = [
  {
    file: '/home/palominodev/Descargas/Escuela Vida Y Ministerio 2025 - Hoja 4.csv',
    label: 'julio',
    weeks: [
      { start: '2026-07-06', semana: '6-12 de julio', create: false },
      { start: '2026-07-13', semana: '13-19 de julio', create: false },
      { start: '2026-07-20', semana: '20-26 de julio', create: false },
      { start: '2026-07-27', semana: '27 de julio a 2 de agosto', create: false },
    ],
  },
  {
    file: '/home/palominodev/Descargas/Escuela Vida Y Ministerio 2025 - Hoja 2.csv',
    label: 'agosto',
    weeks: [
      { start: '2026-08-03', semana: '3-9 de agosto', create: true },
      { start: '2026-08-10', semana: '10-16 de agosto', create: true },
      { start: '2026-08-17', semana: '17-23 de agosto', create: true },
      { start: '2026-08-24', semana: '24-30 de agosto', create: true },
      { start: '2026-08-31', semana: '31 de agosto a 6 de septiembre', create: true },
    ],
  },
  {
    file: '/home/palominodev/Descargas/Escuela Vida Y Ministerio 2025 - Hoja 3.csv',
    label: 'septiembre',
    weeks: [
      { start: '2026-09-14', semana: '14-20 de septiembre', create: false },
      { start: '2026-09-21', semana: '21-27 de septiembre', create: false },
      { start: '2026-09-28', semana: '28 de septiembre a 4 de octubre', create: false },
    ],
  },
];

const LABEL_TIPO: Array<[string[], Tipo]> = [
  [['lectura', 'letura'], 'lectura_biblia'],
  [['empiece conversaciones'], 'empiece_conversaciones'],
  [['haga revisitas'], 'haga_revisitas'],
  [['haga discipulos'], 'haga_discipulos'],
  [['discurso'], 'discurso'],
  [['explique sus creencias'], 'explique_sus_creencias'],
  [['que diria'], 'que_diria'],
];
const SKIP_LABELS = [
  'presidente', 'tesoros', 'busquemos perlas', 'estudio', 'lector', 'oracion',
  'necesidades', 'informe', 'campana', 'repaso', 'visita del circuito', 'asamblea',
  'discurso final', 'del pasado al presente', 'jehova', 'seamos adaptables',
  'obedecer es mejor', 'pasos para recuperarnos', 'joven confia', 'quien me toco',
  'conclusion',
];
const EVENT_NAME_PREFIXES = ['visita del circuito', 'asamblea', 'informe', 'campana', 'necesidades'];

export function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zñ ]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function collapse(s: string): string {
  return norm(s).replace(/(.)\1+/g, '$1');
}
export function parseCsv(path: string): string[][] {
  return readFileSync(path, 'utf-8').split('\n').filter((l) => l.trim())
    .map((l) => {
      const out: string[] = []; let cur = ''; let inQ = false;
      for (const ch of l) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      out.push(cur.trim()); return out;
    });
}
export function labelToTipo(label: string): Tipo | 'SKIP' | null {
  const l = collapse(label);
  if (!l) return null;
  // Compare collapsed-vs-collapsed: collapse() also folds double letters
  // (e.g. "creencias" -> "crencia"), so keys must go through it too.
  if (SKIP_LABELS.some((p) => l.startsWith(collapse(p)))) return 'SKIP';
  for (const [keys, tipo] of LABEL_TIPO) if (keys.some((k) => l.startsWith(collapse(k)))) return tipo;
  return 'SKIP'; // unknown labels are non-school rows
}
export function isEventName(name: string): boolean {
  const n = collapse(name);
  return EVENT_NAME_PREFIXES.some((p) => n.startsWith(p));
}

/** One school assignment slot parsed from a sheet (companero optional). */
export interface Slot { tipo: Tipo; presentador: string; companero?: string; }

/** Parsed sheet geometry: raw rows plus the week-block header layout. */
export interface ParsedSheet {
  rows: string[][];
  headerIdx: number;
  /** Column index of each week block's first (left salón) label column. */
  blockCols: number[];
}

/** Parse a sheet file and locate its week blocks; throws on layout mismatch. */
export function parseSheet(spec: SheetSpec): ParsedSheet {
  const rows = parseCsv(spec.file);
  const headerIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().startsWith('semana')));
  if (headerIdx < 0) throw new Error(`${spec.label}: fila de semanas no encontrada`);
  const blockCols = rows[headerIdx].map((c, i) => (c.toLowerCase().startsWith('semana') ? i : -1)).filter((i) => i >= 0);
  if (blockCols.length !== spec.weeks.length) throw new Error(`${spec.label}: ${blockCols.length} bloques ≠ ${spec.weeks.length} semanas configuradas`);
  return { rows, headerIdx, blockCols };
}

/**
 * Extract the ordered slots of the week block whose left salón sits at
 * column `b`, scanning rows below the header in row-major interleave
 * order (rows outer, [b, b+3] inner — side 0 is the left salón).
 */
export function extractSlots(rows: string[][], headerIdx: number, b: number): Slot[] {
  const sides = [b, b + 3]; // two salones per week block
  const slots: Slot[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    for (const s of sides) {
      const label = rows[r][s] || '';
      const name = rows[r][s + 1] || '';
      const tipo = labelToTipo(label);
      if (tipo !== null && tipo !== 'SKIP' && !isEventName(name) && collapse(name).length >= 4) {
        // companion: next row, same column, empty or escenificación label
        let companero: string | undefined;
        const next = rows[r + 1];
        if (next) {
          const nl = collapse(next[s] || '');
          const nn = (next[s + 1] || '').replace(/\s+/g, ' ').trim();
          if ((nl === '' || nl === 'escenificacion') && nn && !isEventName(nn) && collapse(nn).length >= 4) {
            companero = nn;
          }
        }
        slots.push({ tipo, presentador: name.replace(/\s+/g, ' ').trim(), companero });
      }
    }
  }
  return slots;
}
