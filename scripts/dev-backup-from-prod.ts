import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Copies production data into the local development database.
 *
 * SAFETY: the production connection is used for SELECT queries ONLY.
 * This script never writes to production. All writes go to file:data/local.db.
 *
 * Source credentials are read explicitly from `.env` (production), never from
 * `.env.local`, so the local-dev anchor in `.env.local` cannot be confused
 * with the production source.
 *
 * Tables are copied in FK-safe order with explicit column lists so primary
 * keys are preserved.
 *
 * ROLLOUT-AWARE: presentation_* tables are pulled only when they exist in
 * production. When production lacks them, local presentation_assignment rows
 * are still cleared (they FK-reference usuario with ON DELETE RESTRICT and
 * would block the usuario refresh), but presentation_week,
 * presentation_part and presentation_sync_state are preserved so scraped
 * weeks survive and assignments can be regenerated afterwards.
 */

// FK-safe base order: parents before children. Always pulled.
const BASE_INSERT_ORDER = [
  'rol',
  'usuario',
  'grupo',
  'usuario_rol',
  'grupo_usuario',
  'informe',
] as const;

// Optional tables, pulled only when present in production (feature rollout).
// Must already exist locally (create with pnpm db:push first).
const OPTIONAL_INSERT_ORDER = [
  'presentation_week',
  'presentation_part',
  'presentation_assignment',
] as const;

// Local tables that must be cleared for DELETE FK-safety even when they are
// not pulled (they reference base tables with ON DELETE RESTRICT).
const ALWAYS_CLEAR = ['presentation_assignment'] as const;

function loadProdEnv(): Record<string, string> {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    throw new Error('.env (production) not found');
  }
  const envVars: Record<string, string> = {};
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

async function getTables(
  client: ReturnType<typeof createClient>
): Promise<Set<string>> {
  const result = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
  );
  return new Set(result.rows.map((row) => String(row.name)));
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  // Escape single quotes for SQL string literals.
  return `'${String(value).replace(/'/g, "''")}'`;
}

interface ColumnInfo {
  name: string;
  type: string;
}

async function getColumns(
  client: ReturnType<typeof createClient>,
  table: string
): Promise<ColumnInfo[]> {
  const result = await client.execute(`PRAGMA table_info(${table})`);
  return result.rows.map((row) => ({
    name: String(row.name),
    type: String(row.type || 'TEXT'),
  }));
}

/**
 * Production may drift ahead of src/db.sql (e.g., informe.notas).
 * Mirror any extra production columns into the local table before copying,
 * so the dev database is a faithful copy. Local-only ALTER — never production.
 */
async function syncColumns(
  prod: ReturnType<typeof createClient>,
  local: ReturnType<typeof createClient>,
  table: string
): Promise<string[]> {
  const prodCols = await getColumns(prod, table);
  const localCols = new Set((await getColumns(local, table)).map((c) => c.name));
  const added: string[] = [];
  for (const col of prodCols) {
    if (!localCols.has(col.name)) {
      await local.execute(`ALTER TABLE ${table} ADD COLUMN "${col.name}" ${col.type}`);
      added.push(col.name);
    }
  }
  return added;
}

async function copyTable(
  prod: ReturnType<typeof createClient>,
  local: ReturnType<typeof createClient>,
  table: string
): Promise<{ source: number; target: number }> {
  // READ from production (SELECT only).
  const result = await prod.execute(`SELECT * FROM ${table}`);
  const rows = result.rows;

  if (rows.length === 0) {
    return { source: 0, target: 0 };
  }

  const columns = Object.keys(rows[0]);
  const columnList = columns.map((c) => `"${c}"`).join(', ');

  // WRITE to local only (rows were already cleared in the delete phase).
  const statements = rows.map((row) => {
    const values = columns.map((c) => sqlValue(row[c])).join(', ');
    return `INSERT INTO ${table} (${columnList}) VALUES (${values})`;
  });
  await local.batch(statements.map((sql) => ({ sql })));

  const check = await local.execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return { source: rows.length, target: Number(check.rows[0].n) };
}

async function main(): Promise<void> {
  const envVars = loadProdEnv();
  const prodUrl = envVars.TURSO_URL;
  const prodToken = envVars.TURSO_TOKEN;

  if (!prodUrl || !prodUrl.startsWith('libsql://')) {
    throw new Error('Refusing to run: .env TURSO_URL does not look like a remote libsql:// URL');
  }

  const localPath = join(process.cwd(), 'data', 'local.db');
  if (!existsSync(localPath)) {
    throw new Error(`Local DB not found at ${localPath}. Run "pnpm db:push" first.`);
  }

  const prod = createClient({ url: prodUrl, authToken: prodToken });
  const local = createClient({ url: `file:${localPath}` });

  const prodTables = await getTables(prod);
  const localTables = await getTables(local);

  const missingInProd = BASE_INSERT_ORDER.filter((t) => !prodTables.has(t));
  if (missingInProd.length > 0) {
    throw new Error(`Refusing to run: base tables missing in production: ${missingInProd.join(', ')}`);
  }

  // Build the pull list: base tables plus optional tables present in both
  // production and local. Warn about rollout drift in either direction.
  const pull: string[] = [...BASE_INSERT_ORDER];
  for (const table of OPTIONAL_INSERT_ORDER) {
    if (prodTables.has(table) && localTables.has(table)) {
      pull.push(table);
    } else if (prodTables.has(table) && !localTables.has(table)) {
      console.warn(`⚠️  ${table}: exists in production but not locally — run "pnpm db:push" to create it. Skipping.`);
    }
  }
  const preservedLocally = [...OPTIONAL_INSERT_ORDER, 'presentation_sync_state'].filter(
    (t) => !prodTables.has(t) && localTables.has(t)
  );

  // FK-safe DELETE order: children before parents.
  // ALWAYS_CLEAR entries go first even when not pulled (FK release), then the
  // reverse of the pull list without them.
  const deleteOrder: string[] = [
    ...ALWAYS_CLEAR.filter((t) => localTables.has(t)),
    ...[...pull].reverse().filter((t) => !ALWAYS_CLEAR.includes(t as (typeof ALWAYS_CLEAR)[number])),
  ];

  console.log('📥 Copying production data → data/local.db (production is read-only)');
  if (preservedLocally.length > 0) {
    console.log(`ℹ️  Not in production, preserved locally: ${preservedLocally.join(', ')}`);
    console.log('ℹ️  presentation_assignment cleared locally (FK-safety) — regenerate from semanas.');
  }

  // Phase 1: clear local tables children-first so FK checks pass.
  for (const table of deleteOrder) {
    await local.execute(`DELETE FROM ${table}`);
  }

  // Phase 2: copy parents-first so FK checks pass on insert.
  let mismatch = false;
  for (const table of pull) {
    const added = await syncColumns(prod, local, table);
    if (added.length > 0) {
      console.log(`ℹ️  ${table}: mirrored drifted columns from production: ${added.join(', ')}`);
    }
    const { source, target } = await copyTable(prod, local, table);
    const mark = source === target ? '✅' : '❌';
    if (source !== target) mismatch = true;
    console.log(`${mark} ${table}: source=${source} target=${target}`);
  }

  if (mismatch) {
    console.error('❌ Row-count mismatch detected — check the local DB before using it.');
    process.exit(1);
  }
  console.log('✅ Backup complete. Production was not modified.');
}

main().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
