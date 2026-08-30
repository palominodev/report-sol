import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Merges the duplicate usuario rows created by scripts/seed-july-assignments.ts
 * (July 2026 seed) into the pre-existing real users, in the LOCAL database.
 *
 * Background: the seed inserted 12 users whose names only differ from existing
 * rows by accents/spelling (e.g. "Fernández" vs "Fernandez"). The decision is
 * to keep the EXISTING rows (and their DB spelling), re-point the July
 * presentation assignments to them, and delete the duplicate rows.
 * Daniel Grimaldo (id 160) is a genuinely new person and is NOT touched here.
 *
 * Behavior:
 * - LOCAL ONLY: refuses to run when the configured database is not a file: URL.
 * - Idempotent: pairs whose duplicate id no longer exists are skipped.
 * - The DELETE runs after re-pointing assignments; the FK is ON DELETE RESTRICT,
 *   so a successful delete also proves no dangling references remain.
 * - Backfills genero on the kept rows when it is NULL.
 * - All writes happen inside a single transaction.
 *
 * Run: pnpm tsx scripts/merge-july-duplicate-users.ts
 */

type DatabaseClient = ReturnType<typeof createClient>;
type Genero = 'masculino' | 'femenino';

interface MergePair {
  /** Duplicate usuario id created by the July seed (to be deleted). */
  from: number;
  /** Existing real usuario id (kept; assignments re-pointed to it). */
  to: number;
  /** Known gender of the person, used only to backfill a NULL genero. */
  genero: Genero;
}

// Duplicate id -> existing real id (per user decision; keep DB spelling).
const MERGE_MAP: MergePair[] = [
  { from: 156, to: 28, genero: 'masculino' }, // Alberto Fernández -> Alberto Fernandez
  { from: 157, to: 134, genero: 'masculino' }, // Sebastian Avilés -> Sebastian Aviles
  { from: 158, to: 61, genero: 'masculino' }, // Juan Sirlupú -> Juan Sirlopu
  { from: 159, to: 46, genero: 'masculino' }, // Andrew Fernández -> Andrew Fernandez
  { from: 161, to: 125, genero: 'masculino' }, // Lucas Ramírez -> Lucas Ramirez
  { from: 162, to: 62, genero: 'masculino' }, // Ludwig Fernández -> Ludwig Fernandez
  { from: 163, to: 127, genero: 'masculino' }, // Bryan Avilés -> Bryan Aviles
  { from: 164, to: 42, genero: 'femenino' }, // Sonia Fernández -> Sonia Fernandez
  { from: 165, to: 119, genero: 'femenino' }, // Jhenny Fernández -> Jheny Fernandez
  { from: 166, to: 145, genero: 'femenino' }, // Dayana Nieva -> Dayanna Nieva
  { from: 167, to: 115, genero: 'femenino' }, // Karen Valeriano -> Karin Valeriano
  { from: 168, to: 40, genero: 'femenino' }, // Erica Castillo -> Erika Castillo
];

// ---------------------------------------------------------------------------
// Env / connection helpers (mirrors scripts/seed-july-assignments.ts)
// ---------------------------------------------------------------------------

function loadEnvFile(): Record<string, string> {
  const envPath = join(process.cwd(), '.env.local');
  const envVars: Record<string, string> = {};

  if (!existsSync(envPath)) return envVars;

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=').replace(/['"]/g, '');
    }
  }
  return envVars;
}

function resolveLocalDbPath(envVars: Record<string, string>): string {
  const url = envVars.TURSO_URL?.trim();
  if (url && url.startsWith('file:')) {
    return resolve(process.cwd(), url.slice('file:'.length));
  }
  return join(process.cwd(), 'data', 'local.db');
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return parseInt(value, 10);
  return 0;
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

async function mergePairs(client: DatabaseClient): Promise<{ merged: number; skipped: number; rePointed: number; generoBackfilled: number }> {
  let merged = 0;
  let skipped = 0;
  let rePointed = 0;
  let generoBackfilled = 0;

  for (const pair of MERGE_MAP) {
    const duplicate = await client.execute({
      sql: 'SELECT id_usuario FROM usuario WHERE id_usuario = ?',
      args: [pair.from],
    });
    if (duplicate.rows.length === 0) {
      // Already merged (or never existed): idempotent skip.
      console.log(`  ⏭️  ${pair.from} -> ${pair.to}: duplicado ya no existe, se omite.`);
      skipped++;
      continue;
    }

    // Re-point July assignments from the duplicate to the existing user.
    const update = await client.execute({
      sql: 'UPDATE presentation_assignment SET id_usuario = ? WHERE id_usuario = ?',
      args: [pair.to, pair.from],
    });
    rePointed += toNumber(update.rowsAffected);

    // Delete the duplicate row. The FK is ON DELETE RESTRICT, so this fails
    // loudly if any reference (in any table) still points at the duplicate.
    await client.execute({
      sql: 'DELETE FROM usuario WHERE id_usuario = ?',
      args: [pair.from],
    });

    // Backfill genero on the kept row if it is NULL.
    const backfill = await client.execute({
      sql: 'UPDATE usuario SET genero = ? WHERE id_usuario = ? AND genero IS NULL',
      args: [pair.genero, pair.to],
    });
    generoBackfilled += toNumber(backfill.rowsAffected);

    console.log(`  ✅ ${pair.from} -> ${pair.to}: asignaciones movidas: ${toNumber(update.rowsAffected)}, duplicado eliminado.`);
    merged++;
  }

  return { merged, skipped, rePointed, generoBackfilled };
}

// ---------------------------------------------------------------------------
// Verification (read-only)
// ---------------------------------------------------------------------------

async function verify(client: DatabaseClient): Promise<number> {
  let failures = 0;
  const check = (label: string, ok: boolean, detail?: string) => {
    console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures++;
  };

  console.log('\n🔎 Verificación (solo lectura)...');

  const duplicateIds = MERGE_MAP.map((p) => p.from);
  const duplicatePlaceholders = duplicateIds.map(() => '?').join(', ');

  const remainingDuplicates = await client.execute({
    sql: `SELECT COUNT(*) as count FROM usuario WHERE id_usuario IN (${duplicatePlaceholders})`,
    args: duplicateIds,
  });
  check('Duplicados eliminados', toNumber(remainingDuplicates.rows[0].count) === 0, `${remainingDuplicates.rows[0].count} restantes`);

  const grimaldo = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM usuario WHERE id_usuario = ?',
    args: [160],
  });
  check('Daniel Grimaldo (id 160) conservado', toNumber(grimaldo.rows[0].count) === 1);

  const dangling = await client.execute({
    sql: `SELECT COUNT(*) as count FROM presentation_assignment WHERE id_usuario IN (${duplicatePlaceholders})`,
    args: duplicateIds,
  });
  check('Sin asignaciones apuntando a ids eliminados', toNumber(dangling.rows[0].count) === 0);

  const keptIds = MERGE_MAP.map((p) => p.to);
  const keptPlaceholders = keptIds.map(() => '?').join(', ');
  const nullGenero = await client.execute({
    sql: `SELECT COUNT(*) as count FROM usuario WHERE genero IS NULL AND id_usuario IN (${keptPlaceholders})`,
    args: keptIds,
  });
  check('Usuarios conservados con genero', toNumber(nullGenero.rows[0].count) === 0, `${nullGenero.rows[0].count} con genero NULL`);

  return failures;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL?.trim();

  // Hard guard: never run against a remote (Turso) database.
  if (url && !url.startsWith('file:')) {
    console.error('❌ ERROR: Este script solo puede ejecutarse contra la base de datos local (file:).');
    console.error(`   TURSO_URL actual: ${url}`);
    process.exit(1);
  }
  if (envVars.TURSO_TOKEN?.trim()) {
    console.error('❌ ERROR: TURSO_TOKEN presente. Quitá las credenciales de Turso de .env.local para modificar datos locales.');
    process.exit(1);
  }

  const dbPath = resolveLocalDbPath(envVars);
  const client = createClient({ url: `file:${dbPath}` });
  console.log(`🧹 Merge de usuarios duplicados (seed julio 2026)\n📁 Base de datos: ${dbPath}\n`);

  await client.execute('PRAGMA foreign_keys = ON');

  await client.execute('BEGIN');
  try {
    const result = await mergePairs(client);
    console.log(
      `\n📊 Resultado: ${result.merged} pares fusionados, ${result.skipped} omitidos, ` +
        `${result.rePointed} asignaciones re-apuntadas, ${result.generoBackfilled} genero(s) completados.`,
    );
    await client.execute('COMMIT');
  } catch (error) {
    try {
      await client.execute('ROLLBACK');
    } catch {
      // Transaction may not have started; ignore rollback failure.
    }
    throw error;
  }

  const failures = await verify(client);
  if (failures > 0) {
    console.error(`\n❌ Verificación falló en ${failures} chequeo(s).`);
    process.exit(1);
  }
  console.log('\n🎉 Merge completado y verificado sin errores.');
}

main().catch((error: unknown) => {
  console.error('❌ Error durante el merge:', error);
  process.exit(1);
});
