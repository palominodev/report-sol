import { createClient } from '@libsql/client';
import { SHEETS, parseSheet, extractSlots, norm, collapse } from './lib/escuela-csv';

/**
 * Side-aware sala backfill for the Escuela (Vida y Ministerio) CSV history.
 *
 * Replays the ORIGINAL import's slot↔part matching exactly (scripts/
 * import-escuela-assignments.ts): row-major interleave order via
 * extractSlots, tipo-first-fit over the week's parts ORDER BY orden with a
 * used-set. Parts the import created replay as first-fit hits now that they
 * exist. Each matched part is stamped with its slot's salón:
 *
 *   UPDATE presentation_part SET sala=? WHERE id_part=?
 *
 * Safety:
 * - Dry-run by default; --apply executes.
 * - Name-agreement cross-check: every slot's resolved presentador/companero
 *   ids must equal the usuarios actually assigned on the matched part
 *   (rol-exact). ANY mismatch aborts the whole run — the data changed after
 *   the import and stamping rooms onto wrong parts would poison the rule.
 * - A slot that finds no free part also aborts (the import guaranteed every
 *   slot a part; a miss means post-import drift).
 * - Unmatched parts (scraped-only extras) stay NULL — no parity guess.
 * - Idempotent: re-running stamps the same rooms.
 */

// Gate 0.2 (RESOLVED 2026-09-18, obs sdd/salas/delivery-decisions): the LEFT
// column-pair of each week block is Sala A (Principal); the right is Sala B.
// Flip only if the domain owner ever reverses that decision.
const SWAP_SIDES = false;

// Same audit list as import-escuela-assignments.ts (audit 2026-09-18).
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

interface User { id: number; full: string; cfull: string }

interface Stamp { id_part: number; sala: 'A' | 'B'; weekLabel: string; tipo: string }

function salaForSide(side: 0 | 1): 'A' | 'B' {
  const base = side === 0 ? 'A' : 'B';
  if (!SWAP_SIDES) return base;
  return base === 'A' ? 'B' : 'A';
}

async function main() {
  const apply = process.argv.includes('--apply');
  const db = createClient({ url: 'file:data/local.db' });

  const users: User[] = (await db.execute('SELECT id_usuario, nombre, apellido FROM usuario')).rows
    .map((u) => ({ id: Number(u.id_usuario), full: norm(`${u.nombre} ${u.apellido}`), cfull: collapse(`${u.nombre} ${u.apellido}`) }));

  const resolveUser = (name: string): number => {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (NAME_OVERRIDES[clean] !== undefined) return NAME_OVERRIDES[clean];
    const n = norm(clean), cn = collapse(clean);
    const u = users.find((u) => u.full === n || u.cfull === cn);
    if (u) return u.id;
    throw new Error(`Nombre sin resolución: "${clean}" — el CSV cambió respecto del import auditado`);
  };

  const stamps: Stamp[] = [];
  const mismatches: string[] = [];
  const anomalies: string[] = [];
  let totalSlots = 0;
  let agreedSlots = 0;
  const perWeek: Array<{ label: string; start: string; slots: number; matched: number; agreed: number; a: number; b: number; nullParts: number }> = [];

  for (const sheet of SHEETS) {
    const { rows, headerIdx, blockCols } = parseSheet(sheet);

    for (let w = 0; w < sheet.weeks.length; w++) {
      const spec = sheet.weeks[w];
      const b = blockCols[w];
      const slots = extractSlots(rows, headerIdx, b);
      const label = `${sheet.label} · ${spec.semana}`;

      const wk = await db.execute({ sql: 'SELECT id_week FROM presentation_week WHERE fecha_inicio = ?', args: [spec.start] });
      if (wk.rows.length === 0) {
        anomalies.push(`${label} (${spec.start}): semana inexistente en la DB — ¿corrió el import?`);
        continue;
      }
      const idWeek = Number(wk.rows[0].id_week);

      const existing = (await db.execute('SELECT id_part, tipo, orden FROM presentation_part WHERE id_week = ? ORDER BY orden', [idWeek])).rows;
      const used = new Set<number>();
      let weekAgreed = 0;
      let weekMatched = 0;

      for (const slot of slots) {
        totalSlots++;
        const found = existing.find((p) => p.tipo === slot.tipo && !used.has(Number(p.id_part)));
        if (!found) {
          anomalies.push(`${label}: slot ${slot.tipo} (${slot.presentador}) sin part libre — datos cambiados post-import`);
          continue;
        }
        used.add(Number(found.id_part));
        weekMatched++;

        // Name-agreement cross-check (rol-exact) against live assignments.
        const asigs = (await db.execute('SELECT rol, id_usuario FROM presentation_assignment WHERE id_part = ?', [Number(found.id_part)])).rows;
        const actualPres = asigs.find((a) => a.rol === 'presentador');
        const actualComp = asigs.find((a) => a.rol === 'companero');
        const expectedPres = resolveUser(slot.presentador);
        const expectedComp = slot.companero ? resolveUser(slot.companero) : undefined;

        const presOk = actualPres !== undefined && Number(actualPres.id_usuario) === expectedPres;
        const compOk = expectedComp !== undefined
          ? actualComp !== undefined && Number(actualComp.id_usuario) === expectedComp
          : actualComp === undefined;

        if (presOk && compOk) {
          agreedSlots++;
          weekAgreed++;
        } else {
          mismatches.push(
            `${label}: part #${found.id_part} (${slot.tipo}) — ` +
            `CSV ${slot.presentador}#${expectedPres}${expectedComp !== undefined ? ` + ${slot.companero}#${expectedComp}` : ''} vs ` +
            `DB ${actualPres ? `#${actualPres.id_usuario}` : 'sin presentador'}${actualComp ? ` + #${actualComp.id_usuario} (companero)` : ''}`
          );
        }

        stamps.push({ id_part: Number(found.id_part), sala: salaForSide(slot.side), weekLabel: label, tipo: slot.tipo });
      }

      const a = stamps.filter((s) => s.weekLabel === label && s.sala === 'A').length;
      const bb = stamps.filter((s) => s.weekLabel === label && s.sala === 'B').length;
      const nullParts = existing.length - used.size;
      perWeek.push({ label, start: spec.start, slots: slots.length, matched: weekMatched, agreed: weekAgreed, a, b: bb, nullParts });
    }
  }

  // ---- Report ----
  console.log(`\n${apply ? 'APLICAR' : 'DRY-RUN'} — replays del import (SWAP_SIDES=${SWAP_SIDES})\n`);
  for (const w of perWeek) {
    console.log(`📅 ${w.label}: slots=${w.slots} matched=${w.matched} acuerdo=${w.agreed} → A=${w.a} B=${w.b} NULL(restantes)=${w.nullParts}`);
  }
  const rate = totalSlots === 0 ? 0 : Math.round((agreedSlots / totalSlots) * 100);
  console.log(`\nAcuerdo de nombres: ${agreedSlots}/${totalSlots} slots (${rate}%)`);

  if (anomalies.length > 0) {
    console.log('\n⚠️  Anomalías (semana/slot sin part):');
    anomalies.forEach((m) => console.log(`   ${m}`));
  }
  if (mismatches.length > 0) {
    console.log('\n❌ Desacuerdas nombre↔asignación (ABORTA la corrida):');
    mismatches.forEach((m) => console.log(`   ${m}`));
  }

  if (mismatches.length > 0 || anomalies.length > 0) {
    console.error(`\n❌ Abortado: ${mismatches.length} desacuerdos, ${anomalies.length} anomalías. Nada fue escrito.`);
    db.close();
    process.exit(1);
  }

  if (!apply) {
    console.log(`\nSe estamparían ${stamps.length} salas (A=${stamps.filter((s) => s.sala === 'A').length}, B=${stamps.filter((s) => s.sala === 'B').length}). Corré con --apply para ejecutar.`);
    db.close();
    return;
  }

  for (const s of stamps) {
    await db.execute({ sql: 'UPDATE presentation_part SET sala = ? WHERE id_part = ?', args: [s.sala, s.id_part] });
  }
  console.log(`\n✅ Salas estampadas: ${stamps.length}`);

  // Post-apply verification counts (per week + global).
  console.log('\n🔍 Verificación post-apply:');
  for (const w of perWeek) {
    const counts = (await db.execute(
      `SELECT pp.sala AS sala, COUNT(*) AS n FROM presentation_part pp
       JOIN presentation_week pw ON pp.id_week = pw.id_week
       WHERE pw.fecha_inicio = ?
       GROUP BY pp.sala`,
      [w.start]
    )).rows;
    console.log(`   ${w.label}: ` + counts.map((c) => `${c.sala ?? 'NULL'}=${c.n}`).join(', '));
  }
  const global = (await db.execute('SELECT sala, COUNT(*) AS n FROM presentation_part GROUP BY sala')).rows;
  console.log('   GLOBAL: ' + global.map((c) => `${c.sala ?? 'NULL'}=${c.n}`).join(', '));
  db.close();
}

main().catch((e) => { console.error('❌', e instanceof Error ? e.message : e); process.exit(1); });
