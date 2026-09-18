import { createClient, type InValue } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Mirrors presentation data + genero from the DEV database into PRODUCTION:
 * missing usuarios (incl. genero), genero backfill, missing presentation
 * weeks/parts/assignments. Dev is the source of truth; ids are copied
 * explicitly so both databases stay aligned.
 *
 * Dry-run by default; --apply executes. Idempotent: only inserts rows whose
 * id is missing on the target; genero updates only where it differs.
 */

function loadProdEnv(): { url: string; token: string } {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) throw new Error('.env (production) not found');
  const envVars: Record<string, string> = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=').replace(/['"]/g, '');
    }
  }
  const { TURSO_URL, TURSO_TOKEN } = envVars;
  if (!TURSO_URL?.startsWith('libsql://') || !TURSO_TOKEN) {
    throw new Error('Refusing: .env TURSO_URL/TURSO_TOKEN do not look like production credentials');
  }
  return { url: TURSO_URL, token: TURSO_TOKEN };
}

interface Row { [key: string]: unknown }

function rowValues(row: Row, columns: string[]): InValue[] {
  return columns.map((c) => (row[c] ?? null) as InValue);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { url, token } = loadProdEnv();
  const dev = createClient({ url: 'file:data/local.db' });
  const prod = createClient({ url, authToken: token });

  // ---- usuarios: insert missing (full row incl. genero) ----
  const devUsuarios = (await dev.execute('SELECT * FROM usuario ORDER BY id_usuario')).rows;
  const prodIds = new Set(
    (await prod.execute('SELECT id_usuario FROM usuario')).rows.map((r) => Number(r.id_usuario))
  );
  const newUsuarios = devUsuarios.filter((r) => !prodIds.has(Number(r.id_usuario)));
  console.log(`usuarios faltantes en prod: ${newUsuarios.length}`);
  for (const u of newUsuarios) console.log(`   + #${u.id_usuario} ${u.nombre} ${u.apellido} (genero: ${u.genero ?? 'NULL'})`);

  // ---- genero: dev is truth, update only where different ----
  const prodGenero = new Map(
    (await prod.execute('SELECT id_usuario, genero FROM usuario')).rows.map((r) => [Number(r.id_usuario), r.genero])
  );
  const generoUpdates = devUsuarios.filter((r) => prodGenero.has(Number(r.id_usuario)) && prodGenero.get(Number(r.id_usuario)) !== r.genero);
  console.log(`genero a actualizar en prod: ${generoUpdates.length}`);

  // ---- weeks ----
  const devWeeks = (await dev.execute('SELECT * FROM presentation_week ORDER BY id_week')).rows;
  const prodWeekIds = new Set(
    (await prod.execute('SELECT id_week FROM presentation_week')).rows.map((r) => Number(r.id_week))
  );
  const newWeeks = devWeeks.filter((r) => !prodWeekIds.has(Number(r.id_week)));
  console.log(`semanas faltantes en prod: ${newWeeks.length}`);
  newWeeks.forEach((w) => console.log(`   + #${w.id_week} ${w.semana} (${w.fecha_inicio})`));

  // existing weeks: sync estado (dev is truth; e.g. weeks generated in dev)
  const prodWeekEstado = new Map(
    (await prod.execute('SELECT id_week, estado FROM presentation_week')).rows.map((r) => [Number(r.id_week), String(r.estado)])
  );
  const estadoUpdates = devWeeks.filter(
    (r) => prodWeekEstado.has(Number(r.id_week)) && prodWeekEstado.get(Number(r.id_week)) !== String(r.estado)
  );
  console.log(`estados de semana a actualizar: ${estadoUpdates.length}`);
  estadoUpdates.forEach((w) => console.log(`   ~ #${w.id_week} ${w.semana}: ${prodWeekEstado.get(Number(w.id_week))} → ${w.estado}`));

  // ---- parts ----
  const devParts = (await dev.execute('SELECT * FROM presentation_part ORDER BY id_part')).rows;
  const prodPartIds = new Set(
    (await prod.execute('SELECT id_part FROM presentation_part')).rows.map((r) => Number(r.id_part))
  );
  const newParts = devParts.filter((r) => !prodPartIds.has(Number(r.id_part)));
  console.log(`parts faltantes en prod: ${newParts.length}`);

  // ---- assignments ----
  const devAsigs = (await dev.execute('SELECT * FROM presentation_assignment ORDER BY id_asignacion')).rows;
  const prodAsigIds = new Set(
    (await prod.execute('SELECT id_asignacion FROM presentation_assignment')).rows.map((r) => Number(r.id_asignacion))
  );
  const newAsigs = devAsigs.filter((r) => !prodAsigIds.has(Number(r.id_asignacion)));
  console.log(`asignaciones faltantes en prod: ${newAsigs.length}`);

  if (!apply) {
    console.log('\n🔍 DRY-RUN — corré con --apply para ejecutar.');
    dev.close(); prod.close();
    return;
  }

  // ---- apply (FK-safe order; explicit ids; batch = one remote transaction) ----
  if (newUsuarios.length > 0) {
    await prod.batch(newUsuarios.map((u) => ({
      sql: `INSERT INTO usuario (id_usuario, nombre, apellido, genero, familia_id) VALUES (?, ?, ?, ?, ?)`,
      args: rowValues(u, ['id_usuario', 'nombre', 'apellido', 'genero', 'familia_id']),
    })));
    console.log(`✅ usuarios insertados: ${newUsuarios.length}`);
  }

  if (generoUpdates.length > 0) {
    await prod.batch(generoUpdates.map((r) => ({
      sql: `UPDATE usuario SET genero = ? WHERE id_usuario = ?`,
      args: [r.genero ?? null, Number(r.id_usuario)],
    })));
    console.log(`✅ genero actualizado: ${generoUpdates.length}`);
  }

  if (newWeeks.length > 0) {
    await prod.batch(newWeeks.map((w) => ({
      sql: `INSERT INTO presentation_week (id_week, semana, issue, fecha_inicio, fecha_fin, estado, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: rowValues(w, ['id_week', 'semana', 'issue', 'fecha_inicio', 'fecha_fin', 'estado', 'created_at']),
    })));
    console.log(`✅ semanas insertadas: ${newWeeks.length}`);
  }

  if (estadoUpdates.length > 0) {
    await prod.batch(estadoUpdates.map((w) => ({
      sql: `UPDATE presentation_week SET estado = ? WHERE id_week = ?`,
      args: [String(w.estado), Number(w.id_week)],
    })));
    console.log(`✅ estados actualizados: ${estadoUpdates.length}`);
  }

  if (newParts.length > 0) {
    await prod.batch(newParts.map((p) => ({
      sql: `INSERT INTO presentation_part (id_part, id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: rowValues(p, ['id_part', 'id_week', 'orden', 'tipo', 'seccion', 'duracion_min', 'escenario', 'fuente', 'leccion', 'punto']),
    })));
    console.log(`✅ parts insertados: ${newParts.length}`);
  }

  if (newAsigs.length > 0) {
    await prod.batch(newAsigs.map((a) => ({
      sql: `INSERT INTO presentation_assignment (id_asignacion, id_part, id_week, id_usuario, rol, estado, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: rowValues(a, ['id_asignacion', 'id_part', 'id_week', 'id_usuario', 'rol', 'estado', 'created_at']),
    })));
    console.log(`✅ asignaciones insertadas: ${newAsigs.length}`);
  }

  // ---- verification: counts must match dev ----
  for (const [table, key] of [['usuario', 'id_usuario'], ['presentation_week', 'id_week'], ['presentation_part', 'id_part'], ['presentation_assignment', 'id_asignacion']] as const) {
    const d = await dev.execute(`SELECT COUNT(*) AS n FROM ${table}`);
    const p = await prod.execute(`SELECT COUNT(*) AS n FROM ${table}`);
    const match = Number(d.rows[0].n) === Number(p.rows[0].n) ? 'OK' : '❌ DESVIACIÓN';
    console.log(`${match} ${table}: dev=${d.rows[0].n} prod=${p.rows[0].n}`);
  }
  const gen = await prod.execute(`SELECT genero, COUNT(*) AS n FROM usuario GROUP BY genero ORDER BY genero`);
  console.log('prod genero: ' + gen.rows.map((r) => `${r.genero ?? 'NULL'}=${r.n}`).join(', '));
  const fk = await prod.execute('PRAGMA foreign_key_check');
  console.log(`fk violations: ${fk.rows.length}`);

  dev.close(); prod.close();
}

main().catch((e) => { console.error('❌', e instanceof Error ? e.message : e); process.exit(1); });
