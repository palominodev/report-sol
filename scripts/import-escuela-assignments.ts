import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

/**
 * Imports the congregation's Escuela (Vida y Ministerio) assignment history
 * from the three 2026 CSV sheets (julio=Hoja 4, agosto=Hoja 2,
 * septiembre=Hoja 3) into the DEV database (data/local.db).
 *
 * Layout: each sheet has week blocks of 6 columns; each block carries two
 * label/name column-pairs (two salones running the school in parallel).
 * A part's companero sits one row below, same column, with an empty or
 * "(Escenificación)" label.
 *
 * Behavior:
 * - Dry-run by default; --apply executes.
 * - Weeks: existing ones matched by fecha_inicio; August weeks are created
 *   (estado 'confirmada', issue '2026-08').
 * - Parts: reused in tipo/orden order when the scraped part exists; missing
 *   ones created (fuente 'csv-import-2026', tipo defaults).
 * - Assignments: INSERT OR REPLACE with estado 'manual'.
 * - '¿Quién me tocó?' omitted by decision; 'Explique sus creencias' imported
 *   as tipo 'explique_sus_creencias' (schema updated accordingly).
 * - Daniel Grimaldo is created as a new usuario (no group) per user decision.
 * - Unknown names abort the run (nothing is silently dropped).
 */

type Tipo =
  | 'lectura_biblia' | 'empiece_conversaciones' | 'haga_revisitas'
  | 'haga_discipulos' | 'discurso' | 'que_diria' | 'explique_sus_creencias';

interface SheetSpec {
  file: string;
  label: string;
  weeks: Array<{ start: string; semana: string; create: boolean }>;
}

const SHEETS: SheetSpec[] = [
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

// User-confirmed resolutions + accepted spelling variants (audit 2026-09-18).
const NAME_OVERRIDES: Record<string, number> = {
  'Cinthia Mayanga': 148,
  'Maricruz Salca': 56,
  'Liset Carrasco': 103,
  'Lisset Carrasco': 103,
  'Sara Córdova': 52,
  'Pamela Castillo': 21,
  'Enmanuel Racchumi': 72,
  'Emanuel Racchumi': 72,
  'Erica Castillo': 40,
  'Francisco Rivadeneyra': 29,
  'Gladys Daza': 123,
  'Karen Valeriano': 115,
  'LourdesCastillo': 13,
  'Michel Sotomayor': 65,
  'Rosmery Racchumi': 51,
  'Dayana Nieva': 145,
  'Adany Gutierrez': 153,
};
const CREATE_USUARIOS = [{ csvName: 'Daniel Grimaldo', nombre: 'Daniel', apellido: 'Grimaldo' }];

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

const DURACION_DEFAULT: Record<Tipo, number> = {
  lectura_biblia: 4, empiece_conversaciones: 2, haga_revisitas: 4,
  haga_discipulos: 5, discurso: 5, que_diria: 4, explique_sus_creencias: 5,
};

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zñ ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function collapse(s: string): string {
  return norm(s).replace(/(.)\1+/g, '$1');
}
function parseCsv(path: string): string[][] {
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
function labelToTipo(label: string): Tipo | 'SKIP' | null {
  const l = collapse(label);
  if (!l) return null;
  // Compare collapsed-vs-collapsed: collapse() also folds double letters
  // (e.g. "creencias" -> "crencias"), so keys must go through it too.
  if (SKIP_LABELS.some((p) => l.startsWith(collapse(p)))) return 'SKIP';
  for (const [keys, tipo] of LABEL_TIPO) if (keys.some((k) => l.startsWith(collapse(k)))) return tipo;
  return 'SKIP'; // unknown labels are non-school rows
}
function isEventName(name: string): boolean {
  const n = collapse(name);
  return EVENT_NAME_PREFIXES.some((p) => n.startsWith(p));
}

interface Slot { tipo: Tipo; presentador: string; companero?: string; }
interface PlanWeek { id: number; start: string; label: string; slots: Slot[]; created: boolean; }

async function main() {
  const apply = process.argv.includes('--apply');
  const db = createClient({ url: 'file:data/local.db' });

  const users = (await db.execute('SELECT id_usuario, nombre, apellido FROM usuario')).rows
    .map((u) => ({ id: Number(u.id_usuario), full: norm(`${u.nombre} ${u.apellido}`), cfull: collapse(`${u.nombre} ${u.apellido}`) }));

  const resolveUser = (name: string): { id: number; note: string } => {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (NAME_OVERRIDES[clean] !== undefined) return { id: NAME_OVERRIDES[clean], note: 'override' };
    const n = norm(clean), cn = collapse(clean);
    const u = users.find((u) => u.full === n || u.cfull === cn);
    if (u) return { id: u.id, note: 'match' };
    const created = CREATE_USUARIOS.find((c) => norm(c.csvName) === n);
    if (created && createdIds.has(clean)) return { id: createdIds.get(clean)!, note: 'CREADO' };
    throw new Error(`Nombre sin resolución: "${clean}" — revisar antes de aplicar`);
  };

  // Pre-create Daniel Grimaldo when applying (need the id for the plan either way).
  const createdIds = new Map<string, number>();
  for (const c of CREATE_USUARIOS) {
    if (apply) {
      await db.execute({ sql: 'INSERT INTO usuario (nombre, apellido) VALUES (?, ?)', args: [c.nombre, c.apellido] });
      const r = await db.execute(`SELECT MAX(id_usuario) AS id FROM usuario`);
      createdIds.set(c.csvName, Number(r.rows[0].id));
      console.log(`👤 Usuario creado: ${c.nombre} ${c.apellido} (#${r.rows[0].id})`);
    } else {
      createdIds.set(c.csvName, -1); // placeholder for dry-run
    }
  }

  const plans: PlanWeek[] = [];
  for (const sheet of SHEETS) {
    const rows = parseCsv(sheet.file);
    const headerIdx = rows.findIndex((r) => r.some((c) => c.toLowerCase().startsWith('semana')));
    if (headerIdx < 0) throw new Error(`${sheet.label}: fila de semanas no encontrada`);
    const blockCols = rows[headerIdx].map((c, i) => (c.toLowerCase().startsWith('semana') ? i : -1)).filter((i) => i >= 0);
    if (blockCols.length !== sheet.weeks.length) throw new Error(`${sheet.label}: ${blockCols.length} bloques ≠ ${sheet.weeks.length} semanas configuradas`);

    for (let w = 0; w < sheet.weeks.length; w++) {
      const spec = sheet.weeks[w];
      const b = blockCols[w];
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

      const wk = await db.execute({ sql: 'SELECT id_week FROM presentation_week WHERE fecha_inicio = ?', args: [spec.start] });
      let id: number; let created = false;
      if (wk.rows.length > 0) id = Number(wk.rows[0].id_week);
      else if (spec.create) {
        const fin = new Date(spec.start); fin.setDate(fin.getDate() + 6);
        if (apply) {
          await db.execute({
            sql: `INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado) VALUES (?, '2026-08', ?, ?, 'confirmada')`,
            args: [spec.semana, spec.start, fin.toISOString().slice(0, 10)],
          });
          id = Number((await db.execute(`SELECT MAX(id_week) AS id FROM presentation_week`)).rows[0].id);
        } else { id = -1; }
        created = true;
      } else throw new Error(`Semana ${spec.start} (${sheet.label}) no existe en la DB y no está marcada para crear`);

      plans.push({ id, start: spec.start, label: `${sheet.label} · ${spec.semana}`, slots, created });
    }
  }

  // ---- Plan / apply ----
  let totalParts = 0, totalAssignments = 0;
  for (const plan of plans) {
    console.log(`\n📅 ${plan.label} (${plan.start})${plan.created ? ' [SEMANA NUEVA]' : ''}`);
    const existing = plan.id > 0
      ? (await db.execute('SELECT id_part, tipo, orden FROM presentation_part WHERE id_week = ? ORDER BY orden', [plan.id])).rows
      : [];
    const used = new Set<number>();
    let nextOrden = existing.length ? Math.max(...existing.map((p) => Number(p.orden))) : 0;

    for (const slot of plan.slots) {
      const pres = resolveUser(slot.presentador);
      const comp = slot.companero ? resolveUser(slot.companero) : undefined;

      const found = existing.find((p) => p.tipo === slot.tipo && !used.has(Number(p.id_part)));
      let partId: number | undefined;
      let partDesc: string;
      if (found) {
        used.add(Number(found.id_part));
        partId = Number(found.id_part);
        partDesc = `part #${found.id_part} (${slot.tipo}, reutilizado)`;
      } else {
        nextOrden++;
        const seccion = slot.tipo === 'lectura_biblia' ? 'TESOROS_DE_LA_BIBLIA' : 'SEAMOS_MEJORES_MAESTROS';
        partDesc = `part NUEVO (${slot.tipo} orden ${nextOrden})`;
        if (apply) {
          await db.execute({
            sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente) VALUES (?, ?, ?, ?, ?, 'csv-import-2026')`,
            args: [plan.id, nextOrden, slot.tipo, seccion, DURACION_DEFAULT[slot.tipo]],
          });
          partId = Number((await db.execute(`SELECT MAX(id_part) AS id FROM presentation_part`)).rows[0].id);
        }
        totalParts++;
      }
      console.log(`   ${slot.tipo}: ${slot.presentador} (#${pres.id}${pres.note === 'override' ? '↦' : pres.note === 'CREADO' ? '✚' : ''})${comp ? ` + ${slot.companero} (#${comp.id})` : ''} → ${partDesc}`);
      if (apply && partId !== undefined) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado) VALUES (?, ?, ?, 'presentador', 'manual')`,
          args: [partId, plan.id, pres.id],
        });
        totalAssignments++;
        if (comp) {
          await db.execute({
            sql: `INSERT OR REPLACE INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado) VALUES (?, ?, ?, 'companero', 'manual')`,
            args: [partId, plan.id, comp.id],
          });
          totalAssignments++;
        }
      }
    }
    if (apply && plan.id > 0) {
      await db.execute({ sql: `UPDATE presentation_week SET estado = 'confirmada' WHERE id_week = ?`, args: [plan.id] });
    }
  }

  console.log(`\n${apply ? '✅ APLICADO' : '🔍 DRY-RUN'}: ${plans.length} semanas, ${totalParts} parts nuevos, ${totalAssignments} asignaciones.`);
  if (!apply) console.log('Corré con --apply para ejecutar.');
  db.close();
}

main().catch((e) => { console.error('❌', e instanceof Error ? e.message : e); process.exit(1); });
