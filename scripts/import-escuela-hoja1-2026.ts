import { createClient, type InStatement } from '@libsql/client';
import { readFileSync } from 'fs';
import { norm, collapse, type Slot, type Tipo } from './lib/escuela-csv';
import {
  splitCsvLines, findWeekBlocks, extractBlockSlots, formatWeekLabel, addDays,
  type WeekBlock, type DroppedName, type UnmappedLabel,
} from './lib/escuela-hoja1';

/**
 * Imports the 2026 sections of "Escuela Vida Y Ministerio 2025 - Hoja 1" into
 * the DEV database (data/local.db — hard-coded on purpose; never Turso/prod).
 *
 * Only raw CSV lines 466..711 are parsed: the "AÑO 2026" section, copy B of
 * Jan-Aug plus the Sep-Dec tail. Earlier lines (2025, copy A, stray 2025
 * copy) are ignored by decision. Layout parsing lives in
 * scripts/lib/escuela-hoja1.ts; this script owns name resolution and all
 * database work.
 *
 * Behavior:
 * - Dry-run by default (SELECT only); --apply executes.
 * - Weeks without any school-part name are reported and left untouched.
 * - Missing weeks are created (estado 'confirmada', issue 'YYYY-MM').
 * - Existing weeks are REPLACED (user decision): their assignments and the
 *   parts with fuente 'csv-import-2026' are deleted, the remaining (scraped)
 *   parts no slot claims get sala NULL, then slots are matched/created exactly like
 *   scripts/import-escuela-assignments.ts and every used part is stamped with
 *   its salón (left column-pair = 'A', right = 'B').
 * - One atomic db.batch per week. Unknown names abort the run before any write.
 */

const CSV_PATH = '/home/palominodev/Descargas/Escuela Vida Y Ministerio 2025 - Hoja 1.csv';
const FIRST_LINE = 466; // 1-based, inclusive ("AÑO 2026")
const LAST_LINE = 711;  // 1-based, inclusive
const YEAR = 2026;
const FUENTE = 'csv-import-2026';

// Resolutions already used by import-escuela-assignments.ts (audit 2026-09-18).
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
// USER-CONFIRMED in this session (Hoja 1).
const USER_CONFIRMED_OVERRIDES: Record<string, number> = {
  'Karen Trujillo': 115,
  'Cintya Correa': 148,
  'Jessica Fernandez': 96,
};
// INFERRED by the implementer: edit distance 1 with a unique candidate. NOT user-confirmed.
const INFERRED_OVERRIDES: Record<string, number> = {
  'Cintia Mayanga': 148,
  'David Guitierrez': 151,
  'David Gutierres': 151,
  'Elizabeth Valeriano': 121,
  'Isabella Gutierrez': 154,
  'Luciana Yangary': 85,
  'Ludwing Fernández': 62,
  'Maricruz Rivadeneyra': 30,
  'Marybel Nieva': 143,
  'Marycruz Salca': 56,
  'Matheo Nieva': 146,
  'Mirian Becerra': 135,
  'Pamella Castillo': 21,
  'Robert Fernánez': 98,
  'Roxana Marchan': 100,
  'Rut Fernández': 113,
  'Zhivelly Balarezo': 36,
};

const DURACION_DEFAULT: Record<Tipo, number> = {
  lectura_biblia: 4, empiece_conversaciones: 2, haga_revisitas: 4,
  haga_discipulos: 5, discurso: 5, que_diria: 4, explique_sus_creencias: 5,
};

type Kind = 'match' | 'match~' | 'override' | 'confirmado' | 'inferido';
interface Resolved { id: number; kind: Kind }

interface DbPart { id_part: number; tipo: Tipo; orden: number; sala: string | null }
interface PlanSlot {
  slot: Slot; pres: Resolved; comp?: Resolved;
  /** Existing part id, or undefined for a NEW part. */
  partId?: number; tipo: Tipo; orden: number; sala: 'A' | 'B';
}
interface PlanWeek {
  block: WeekBlock; label: string; exists: boolean; idWeek?: number;
  previousAssignments: number; csvPartsToDelete: number;
  remaining: DbPart[]; unusedIds: number[]; slots: PlanSlot[]; newParts: number;
  errors: string[];
}

const salaOf = (side: 0 | 1): 'A' | 'B' => (side === 0 ? 'A' : 'B');

async function main() {
  const apply = process.argv.includes('--apply');
  const db = createClient({ url: 'file:data/local.db' });

  // ---- Parse CSV ----
  const all = splitCsvLines(readFileSync(CSV_PATH, 'utf-8'));
  const rows = all.slice(FIRST_LINE - 1, LAST_LINE);
  const offset = FIRST_LINE - 1; // rows[i] is raw line i + FIRST_LINE
  console.log(`CSV: líneas ${FIRST_LINE}..${LAST_LINE} (${rows.length} filas leídas de ${all.length})`);

  const blocks = findWeekBlocks(rows, YEAR);
  const extracted = blocks.map((b) => ({ block: b, ...extractBlockSlots(rows, b) }));

  // ---- Names ----
  const users = (await db.execute('SELECT id_usuario, nombre, apellido FROM usuario')).rows
    .map((u) => ({
      id: Number(u.id_usuario), name: `${u.nombre} ${u.apellido}`,
      full: norm(`${u.nombre} ${u.apellido}`), cfull: collapse(`${u.nombre} ${u.apellido}`),
    }));
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const overrideMaps: Array<[Kind, Map<string, number>]> = [
    ['override', new Map(Object.entries(NAME_OVERRIDES).map(([k, v]) => [norm(k), v]))],
    ['confirmado', new Map(Object.entries(USER_CONFIRMED_OVERRIDES).map(([k, v]) => [norm(k), v]))],
    ['inferido', new Map(Object.entries(INFERRED_OVERRIDES).map(([k, v]) => [norm(k), v]))],
  ];
  const resolveCache = new Map<string, Resolved | null>();
  const resolveUser = (name: string): Resolved | null => {
    const clean = name.replace(/\s+/g, ' ').trim();
    const n = norm(clean);
    if (resolveCache.has(n)) return resolveCache.get(n)!;
    let res: Resolved | null = null;
    for (const [kind, map] of overrideMaps) {
      const id = map.get(n);
      if (id !== undefined) { res = { id, kind }; break; }
    }
    if (!res) {
      const cn = collapse(clean);
      const exact = users.find((u) => u.full === n);
      const loose = exact ?? users.find((u) => u.cfull === cn);
      if (loose) res = { id: loose.id, kind: exact ? 'match' : 'match~' };
    }
    if (res && !userName.has(res.id)) res = null; // override pointing to a missing usuario
    resolveCache.set(n, res);
    return res;
  };
  const usedResolutions = new Map<string, Resolved & { id: number }>();
  const unresolved = new Set<string>();
  for (const e of extracted) {
    for (const s of e.slots) {
      for (const name of [s.presentador, s.companero]) {
        if (!name) continue;
        const r = resolveUser(name);
        if (r) usedResolutions.set(name, r); else unresolved.add(name);
      }
    }
  }
  if (unresolved.size > 0) {
    console.error(`❌ Nombres sin resolución (${unresolved.size}) — revisar antes de aplicar:`);
    [...unresolved].sort().forEach((n) => console.error(`   "${n}"`));
    db.close();
    process.exit(1);
  }

  // ---- Plan ----
  const plans: PlanWeek[] = [];
  const skipped: Array<{ block: WeekBlock; label: string }> = [];
  const labelsSeen = new Map<string, string>();
  for (const e of extracted) {
    const b = e.block;
    const label = formatWeekLabel(b.start);
    if (e.slots.length === 0) { skipped.push({ block: b, label }); continue; }

    const wk = await db.execute({ sql: 'SELECT id_week FROM presentation_week WHERE fecha_inicio = ?', args: [b.start] });
    const exists = wk.rows.length > 0;
    const idWeek = exists ? Number(wk.rows[0].id_week) : undefined;
    const errors: string[] = [];

    if (!exists) {
      const clash = await db.execute({ sql: 'SELECT fecha_inicio FROM presentation_week WHERE semana = ?', args: [label] });
      if (clash.rows.length > 0) errors.push(`semana "${label}" ya existe con fecha_inicio ${clash.rows[0].fecha_inicio} (UNIQUE)`);
    }
    if (labelsSeen.has(label)) errors.push(`etiqueta "${label}" repetida con la semana ${labelsSeen.get(label)}`);
    labelsSeen.set(label, b.start);

    let previousAssignments = 0;
    let csvPartsToDelete = 0;
    let remaining: DbPart[] = [];
    if (exists) {
      previousAssignments = Number((await db.execute({ sql: 'SELECT COUNT(*) AS n FROM presentation_assignment WHERE id_week = ?', args: [idWeek!] })).rows[0].n);
      const parts = (await db.execute({
        sql: 'SELECT id_part, tipo, orden, sala, fuente FROM presentation_part WHERE id_week = ? ORDER BY orden, id_part', args: [idWeek!],
      })).rows;
      csvPartsToDelete = parts.filter((p) => p.fuente === FUENTE).length;
      remaining = parts.filter((p) => p.fuente !== FUENTE)
        .map((p) => ({ id_part: Number(p.id_part), tipo: p.tipo as Tipo, orden: Number(p.orden), sala: (p.sala as string | null) ?? null }));
    }

    // Same matching as import-escuela-assignments.ts: row-major slots, tipo first-fit with used-set.
    const used = new Set<number>();
    let nextOrden = remaining.length ? Math.max(...remaining.map((p) => p.orden)) : 0;
    const slots: PlanSlot[] = [];
    let newParts = 0;
    for (const slot of e.slots) {
      const pres = resolveUser(slot.presentador)!;
      const comp = slot.companero ? resolveUser(slot.companero)! : undefined;
      const found = remaining.find((p) => p.tipo === slot.tipo && !used.has(p.id_part));
      if (found) {
        used.add(found.id_part);
        slots.push({ slot, pres, comp, partId: found.id_part, tipo: slot.tipo, orden: found.orden, sala: salaOf(slot.side) });
      } else {
        nextOrden++;
        newParts++;
        slots.push({ slot, pres, comp, tipo: slot.tipo, orden: nextOrden, sala: salaOf(slot.side) });
      }
    }
    // Final unique index check over (tipo, orden, sala) of stamped + untouched parts.
    const finalKeys = new Set<string>();
    const finalParts = [
      ...slots.map((s) => ({ tipo: s.tipo, orden: s.orden, sala: s.sala as string | null })),
      ...remaining.filter((p) => !used.has(p.id_part)).map((p) => ({ tipo: p.tipo, orden: p.orden, sala: null as string | null })),
    ];
    for (const p of finalParts) {
      const k = `${p.tipo}|${p.orden}|${p.sala ?? ''}`;
      if (finalKeys.has(k)) errors.push(`colisión de índice único en (${p.tipo}, orden ${p.orden}, sala ${p.sala ?? 'NULL'})`);
      finalKeys.add(k);
    }

    plans.push({ block: b, label, exists, idWeek, previousAssignments, csvPartsToDelete, remaining, unusedIds: remaining.filter((p) => !used.has(p.id_part)).map((p) => p.id_part), slots, newParts, errors });
  }

  // ---- Report ----
  const rawLine = (r: number) => r + offset; // r is already 1-based within the region
  let totalSlots = 0, totalNewParts = 0, totalAssignments = 0;
  const perMonth = new Map<number, number>();
  const odd: string[] = [];
  for (const plan of plans) {
    const tag = plan.exists ? `[REEMPLAZA ${plan.previousAssignments} asignaciones previas, ${plan.csvPartsToDelete} parts csv-import borrados]` : '[NUEVA]';
    console.log(`\n📅 ${plan.block.start} · ${plan.label} ${tag}`);
    for (const ps of plan.slots) {
      const pres = `${ps.slot.presentador} (#${ps.pres.id}${ps.pres.kind === 'match' ? '' : '↦'})`;
      const comp = ps.slot.companero && ps.comp ? ` + ${ps.slot.companero} (#${ps.comp.id}${ps.comp.kind === 'match' ? '' : '↦'})` : '';
      const part = ps.partId !== undefined ? `part existente #${ps.partId}` : `part NUEVO (orden ${ps.orden})`;
      console.log(`   ${ps.tipo} ${ps.slot.side}/${ps.sala} ${pres}${comp} → ${part}`);
      totalAssignments += ps.comp ? 2 : 1;
    }
    for (const err of plan.errors) console.log(`   ⛔ ${err}`);
    totalSlots += plan.slots.length;
    totalNewParts += plan.newParts;
    perMonth.set(plan.block.month, (perMonth.get(plan.block.month) ?? 0) + plan.slots.length);
    if (plan.slots.length % 2 === 1 || plan.slots.length < 8) odd.push(`${plan.block.start} (${plan.slots.length})`);
  }
  console.log('\n⏭️  Semanas sin asignaciones, omitidas (no se crean ni modifican):');
  for (const s of skipped) console.log(`   ${s.block.start} · ${s.label} ("${s.block.header}", línea ${rawLine(s.block.headerRow + 1)})`);

  // Diff vs current DB assignments for weeks that will be replaced.
  console.log('\n🔎 Diferencias vs asignaciones ACTUALES de la DB (semanas que se reemplazan; multiconjunto tipo|rol|persona):');
  let diffTotal = 0;
  for (const plan of plans.filter((p) => p.exists)) {
    const cur = (await db.execute({
      sql: `SELECT pp.tipo AS tipo, pa.rol AS rol, pa.id_usuario AS id FROM presentation_assignment pa
            JOIN presentation_part pp ON pp.id_part = pa.id_part WHERE pa.id_week = ?`, args: [plan.idWeek!],
    })).rows.map((r) => `${r.tipo}|${r.rol}|${Number(r.id)}`);
    const next = plan.slots.flatMap((ps) => [
      `${ps.tipo}|presentador|${ps.pres.id}`, ...(ps.comp ? [`${ps.tipo}|companero|${ps.comp.id}`] : []),
    ]);
    const count = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
    const cm = count(cur), nm = count(next);
    const removed: string[] = [], added: string[] = [];
    for (const [k, n] of cm) for (let i = 0; i < n - (nm.get(k) ?? 0); i++) removed.push(k);
    for (const [k, n] of nm) for (let i = 0; i < n - (cm.get(k) ?? 0); i++) added.push(k);
    const fmt = (k: string) => { const [t, r, id] = k.split('|'); return `${t}/${r}/${userName.get(Number(id))}`; };
    const mark = plan.block.start <= '2026-09-28' ? '' : ' (fuera de Jul6–Sep28)';
    console.log(`   ${plan.block.start}: DB=${cur.length} CSV=${next.length} quitadas=${removed.length} nuevas=${added.length}${mark}`);
    for (const k of removed) console.log(`      − ${fmt(k)}`);
    for (const k of added) console.log(`      + ${fmt(k)}`);
    diffTotal += removed.length + added.length;
  }
  console.log(`   Total entradas diferentes: ${diffTotal}`);

  // Unmapped labels and dropped names.
  const unmappedAll: Array<UnmappedLabel & { week: string }> = extracted.flatMap((e) => e.unmapped.map((u) => ({ ...u, week: e.block.start })));
  console.log(`\n🏷️  Etiquetas con pinta de escuela NO mapeadas: ${unmappedAll.length}`);
  for (const u of unmappedAll) console.log(`   línea ${rawLine(u.row)} (${u.week}): "${u.label}"`);
  const droppedAll: Array<DroppedName & { week: string }> = extracted.flatMap((e) => e.dropped.map((d) => ({ ...d, week: e.block.start })));
  console.log(`\n🗑️  Nombres descartados bajo etiqueta de escuela: ${droppedAll.length}`);
  for (const d of droppedAll) console.log(`   línea ${rawLine(d.row)} (${d.week}): ${d.label} → "${d.name}" [${d.reason}]`);

  // Name resolutions.
  const nonTrivial = [...usedResolutions.entries()].filter(([, r]) => r.kind !== 'match').sort(([a], [b]) => a.localeCompare(b));
  console.log(`\n👤 Resoluciones no triviales (${nonTrivial.length} de ${usedResolutions.size} textos distintos):`);
  for (const [name, r] of nonTrivial) console.log(`   [${r.kind}] "${name}" → #${r.id} ${userName.get(r.id)}`);

  // Summary.
  const created = plans.filter((p) => !p.exists), replaced = plans.filter((p) => p.exists);
  console.log('\n──────── RESUMEN ────────');
  console.log(`Semanas a crear: ${created.length}`);
  console.log(`Semanas a reemplazar: ${replaced.length}`);
  console.log(`Semanas omitidas (sin asignaciones): ${skipped.length}`);
  console.log(`Parts nuevos: ${totalNewParts}`);
  console.log(`Asignaciones: ${totalAssignments}`);
  console.log(`Slots totales: ${totalSlots}`);
  console.log('Slots por mes: ' + [...perMonth.entries()].sort((a, b) => a[0] - b[0]).map(([m, n]) => `${m}=${n}`).join(' '));
  console.log('Semanas con nº de slots impar o <8: ' + (odd.length ? odd.join(', ') : 'ninguna'));
  console.log('Rango semanas a crear: ' + (created.length ? `${created[0].block.start} … ${created[created.length - 1].block.start}` : '—'));
  console.log('Rango semanas a reemplazar: ' + (replaced.length ? `${replaced[0].block.start} … ${replaced[replaced.length - 1].block.start}` : '—'));

  const planErrors = plans.filter((p) => p.errors.length > 0);
  if (planErrors.length > 0) {
    console.error(`\n❌ Abortado: ${planErrors.length} semana(s) con conflictos (ver ⛔). Nada fue escrito.`);
    db.close();
    process.exit(1);
  }

  if (!apply) {
    console.log('\n🔍 DRY-RUN: no se escribió nada. Corré con --apply para ejecutar.');
    db.close();
    return;
  }

  // ---- Apply: one atomic batch per week ----
  const weekId = `(SELECT id_week FROM presentation_week WHERE fecha_inicio = ?)`;
  for (const plan of plans) {
    const start = plan.block.start;
    const stmts: InStatement[] = [];
    if (!plan.exists) {
      stmts.push({
        sql: `INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, 'confirmada')`,
        args: [plan.label, start.slice(0, 7), start, addDays(start, 6)],
      });
    } else {
      stmts.push({ sql: `DELETE FROM presentation_assignment WHERE id_week = ${weekId}`, args: [start] });
      stmts.push({ sql: `DELETE FROM presentation_part WHERE id_week = ${weekId} AND fuente = ?`, args: [start, FUENTE] });
      // Scraped parts that no slot claims lose any stale sala; claimed parts are stamped below.
      // (Not a blanket NULL: weeks may hold a Sala A original plus its Sala B clone of the same tipo/orden.)
      for (const id of plan.unusedIds) stmts.push({ sql: 'UPDATE presentation_part SET sala = NULL WHERE id_part = ?', args: [id] });
    }
    for (const ps of plan.slots) {
      if (ps.partId !== undefined) {
        stmts.push({ sql: 'UPDATE presentation_part SET sala = ? WHERE id_part = ?', args: [ps.sala, ps.partId] });
      } else {
        const seccion = ps.tipo === 'lectura_biblia' ? 'TESOROS_DE_LA_BIBLIA' : 'SEAMOS_MEJORES_MAESTROS';
        stmts.push({
          sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente, sala) VALUES (${weekId}, ?, ?, ?, ?, ?, ?)`,
          args: [start, ps.orden, ps.tipo, seccion, DURACION_DEFAULT[ps.tipo], FUENTE, ps.sala],
        });
      }
      const partRef = `(SELECT id_part FROM presentation_part WHERE id_week = ${weekId} AND tipo = ? AND orden = ? AND COALESCE(sala, '') = ?)`;
      const insertAsig = (rol: 'presentador' | 'companero', idUsuario: number) => stmts.push({
        sql: `INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado) VALUES (${partRef}, ${weekId}, ?, ?, 'manual')`,
        args: [start, ps.tipo, ps.orden, ps.sala, start, idUsuario, rol],
      });
      insertAsig('presentador', ps.pres.id);
      if (ps.comp) insertAsig('companero', ps.comp.id);
    }
    stmts.push({ sql: `UPDATE presentation_week SET estado = 'confirmada' WHERE fecha_inicio = ?`, args: [start] });
    await db.batch(stmts, 'write');
    console.log(`✅ ${start} ${plan.label}: ${plan.slots.length} slots, ${plan.newParts} parts nuevos`);
  }
  console.log(`\n✅ APLICADO: ${plans.length} semanas, ${totalNewParts} parts nuevos, ${totalAssignments} asignaciones.`);
  db.close();
}

main().catch((e) => { console.error('❌', e instanceof Error ? e.message : e); process.exit(1); });
