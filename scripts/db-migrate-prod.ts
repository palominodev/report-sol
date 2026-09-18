import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

type DatabaseClient = ReturnType<typeof createClient>;

/**
 * Production schema migration: adds usuario.genero/familia_id and the
 * presentation_* tables to a target database, then (optionally) seeds
 * presentation_week / presentation_part from the local dev database.
 *
 * Targets (exactly one required, NEVER inferred):
 *   --db <path|url>   e.g. --db data/clone-test.db (dry-run clone)
 *   --prod            remote Turso, credentials from .env
 *
 * Options:
 *   --no-seed         apply DDL only, skip copying weeks/parts from local
 *
 * SAFETY: purely additive DDL (IF NOT EXISTS everywhere, ALTERs guarded by
 * column-existence checks). presentation_assignment is NEVER seeded: local
 * assignments reference local work; prod regenerates its own.
 */

const DDL_PRESENTATION = `
CREATE TABLE IF NOT EXISTS presentation_week (
  id_week INTEGER PRIMARY KEY AUTOINCREMENT,
  semana TEXT NOT NULL UNIQUE,
  issue TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'no_generada'
    CHECK(estado IN ('no_generada','borrador','confirmada')),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS idx_week_fecha ON presentation_week(fecha_inicio);
CREATE TABLE IF NOT EXISTS presentation_part (
  id_part INTEGER PRIMARY KEY AUTOINCREMENT,
  id_week INTEGER NOT NULL,
  orden INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN
    ('lectura_biblia','empiece_conversaciones','haga_revisitas','haga_discipulos','discurso','escenificacion','que_diria')),
  seccion TEXT NOT NULL CHECK(seccion IN ('TESOROS_DE_LA_BIBLIA','SEAMOS_MEJORES_MAESTROS')),
  duracion_min INTEGER NOT NULL CHECK(duracion_min > 0),
  escenario TEXT CHECK(escenario IS NULL OR escenario IN
    ('DE_CASA_EN_CASA','PREDICACION_INFORMAL','PREDICACION_PUBLICA')),
  fuente TEXT NOT NULL,
  leccion INTEGER,
  punto TEXT,
  UNIQUE(id_week, tipo, orden),
  FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_part_week ON presentation_part(id_week);
CREATE TABLE IF NOT EXISTS presentation_assignment (
  id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
  id_part INTEGER NOT NULL,
  id_week INTEGER NOT NULL,
  id_usuario INTEGER NOT NULL,
  rol TEXT NOT NULL CHECK(rol IN ('presentador','companero')),
  estado TEXT NOT NULL DEFAULT 'draft' CHECK(estado IN ('draft','confirmed','manual')),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(id_part, rol),
  FOREIGN KEY (id_part) REFERENCES presentation_part(id_part) ON DELETE CASCADE,
  FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_asig_usuario_week ON presentation_assignment(id_usuario, id_week);
CREATE TABLE IF NOT EXISTS presentation_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  latest_loaded_issue TEXT,
  latest_known_published TEXT,
  last_checked_at TEXT
);`;

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
    throw new Error('--prod requires TURSO_URL (libsql://) and TURSO_TOKEN in .env');
  }
  return { url: TURSO_URL, token: TURSO_TOKEN };
}

function resolveTarget(): { client: DatabaseClient; label: string } {
  const dbFlagIdx = process.argv.indexOf('--db');
  const wantsProd = process.argv.includes('--prod');

  if (dbFlagIdx !== -1 && wantsProd) {
    throw new Error('Pass either --db or --prod, not both');
  }
  if (dbFlagIdx !== -1) {
    const raw = process.argv[dbFlagIdx + 1];
    if (!raw) throw new Error('--db requires a path or URL');
    const url = raw.startsWith('file:') || raw.startsWith('libsql://') ? raw : `file:${raw}`;
    return { client: createClient({ url }), label: url };
  }
  if (wantsProd) {
    const { url, token } = loadProdEnv();
    return { client: createClient({ url, authToken: token }), label: `PRODUCCIÓN ${url}` };
  }
  throw new Error('No target: pass --db <path|url> (clone/dry-run) or --prod (production)');
}

async function tableExists(client: DatabaseClient, table: string): Promise<boolean> {
  const r = await client.execute(
    `SELECT 1 FROM sqlite_master WHERE type='table' AND name='${table}'`
  );
  return r.rows.length > 0;
}

async function columnNames(client: DatabaseClient, table: string): Promise<Set<string>> {
  const r = await client.execute(`PRAGMA table_info(${table})`);
  return new Set(r.rows.map((row) => String(row.name)));
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function seedFromLocal(target: DatabaseClient): Promise<void> {
  const localPath = join(process.cwd(), 'data', 'local.db');
  if (!existsSync(localPath)) throw new Error(`Seed source not found: ${localPath}`);
  const local = createClient({ url: `file:${localPath}` });

  // Weeks first (parent), then parts (child). Assignments are NOT copied.
  const seeds: Array<{ table: string; order: 'parent' | 'child' }> = [
    { table: 'presentation_week', order: 'parent' },
    { table: 'presentation_part', order: 'child' },
  ];

  for (const { table } of seeds) {
    if (!(await tableExists(local, table))) continue;
    const rows = (await local.execute(`SELECT * FROM ${table}`)).rows;
    if (rows.length === 0) {
      console.log(`ℹ️  seed ${table}: local no tiene filas, nada que copiar`);
      continue;
    }
    const columns = Object.keys(rows[0]);
    const columnList = columns.map((c) => `"${c}"`).join(', ');
    const statements = rows.map((row) => {
      const values = columns.map((c) => sqlValue(row[c])).join(', ');
      // OR REPLACE keeps re-runs idempotent without touching prod-only rows.
      return `INSERT OR REPLACE INTO ${table} (${columnList}) VALUES (${values})`;
    });
    await target.batch(statements.map((sql) => ({ sql })));
    const check = await target.execute(`SELECT COUNT(*) AS n FROM ${table}`);
    console.log(`✅ seed ${table}: source=${rows.length} target=${Number(check.rows[0].n)}`);
  }
  local.close();
}

async function verify(target: DatabaseClient): Promise<void> {
  console.log('🔍 Verificación (read-only):');

  const usuarioCols = await columnNames(target, 'usuario');
  const generoOk = usuarioCols.has('genero');
  const familiaOk = usuarioCols.has('familia_id');
  console.log(`${generoOk ? '✅' : '❌'} usuario.genero`);
  console.log(`${familiaOk ? '✅' : '❌'} usuario.familia_id`);
  if (!generoOk || !familiaOk) throw new Error('usuario columns missing after migration');

  const partSql = (
    await target.execute(`SELECT sql FROM sqlite_master WHERE name='presentation_part'`)
  ).rows[0]?.sql as string | undefined;
  const checkOk = partSql?.includes('escenificacion') && partSql?.includes('que_diria');
  console.log(`${checkOk ? '✅' : '❌'} presentation_part.tipo CHECK incluye escenificacion y que_diria`);
  if (!checkOk) throw new Error('presentation_part CHECK is stale');

  for (const t of ['presentation_week', 'presentation_part', 'presentation_assignment', 'presentation_sync_state']) {
    const exists = await tableExists(target, t);
    const n = exists ? Number((await target.execute(`SELECT COUNT(*) AS n FROM ${t}`)).rows[0].n) : -1;
    console.log(`${exists ? '✅' : '❌'} ${t} (filas: ${n})`);
    if (!exists) throw new Error(`${t} missing after migration`);
  }
}

async function main(): Promise<void> {
  const noSeed = process.argv.includes('--no-seed');
  const { client, label } = resolveTarget();
  console.log(`🎯 Target: ${label}${noSeed ? ' (sin seed)' : ''}`);

  // Phase 1: guarded ALTERs on usuario.
  const usuarioCols = await columnNames(client, 'usuario');
  if (!usuarioCols.has('genero')) {
    await client.execute(
      `ALTER TABLE usuario ADD COLUMN genero TEXT CHECK(genero IN ('masculino','femenino'))`
    );
    console.log('✅ ALTER usuario ADD genero');
  } else {
    console.log('↩️  usuario.genero ya existe');
  }
  if (!usuarioCols.has('familia_id')) {
    await client.execute(`ALTER TABLE usuario ADD COLUMN familia_id INTEGER`);
    console.log('✅ ALTER usuario ADD familia_id');
  } else {
    console.log('↩️  usuario.familia_id ya existe');
  }

  // Phase 2: presentation tables + indexes (single batch = one transaction).
  const ddl = DDL_PRESENTATION.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  await client.batch(ddl.map((sql) => ({ sql })));
  console.log(`✅ presentation_* DDL aplicado (${ddl.length} statements)`);

  // Phase 3: seed weeks/parts from local (unless --no-seed).
  if (!noSeed) await seedFromLocal(client);

  await verify(client);
  console.log('🎉 Migración completa.');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
