import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Dual-sala mirror schema migration (UP): swaps the table-level
 * UNIQUE(id_week, tipo, orden) constraint of presentation_part for the
 * expression unique index ux_part_week_tipo_orden_sala over
 * (id_week, tipo, orden, COALESCE(sala, '')), so a Sala A original and its
 * Sala B clone can coexist for the same (week, tipo, orden) while two
 * NULL-sala duplicates for the same triple stay blocked.
 *
 * SQLite cannot drop a table-level UNIQUE constraint, so the swap requires
 * a full table rebuild (migrate-presentation-types.ts precedent):
 * CREATE-COPY-DROP-RENAME with PRAGMA foreign_keys = OFF (so dropping the
 * parent does not cascade into presentation_assignment), all inside one
 * transaction, verified with PRAGMA foreign_key_check before COMMIT. The
 * rebuilt table also normalizes the tipo CHECK to the canonical 7 tipos.
 *
 * Guarded and idempotent: no-ops when sqlite_master already holds the
 * expression index (its stored SQL contains COALESCE). Exported so
 * in-memory tests and scripts/db-migrate-prod.ts (Phase 2.6) drive the
 * exact same path.
 *
 * ORDERING RULE: do NOT run this against data/local.db or production until
 * the adoption-aware upsertWeek merge (PR2) has merged — the old upsert's
 * ON CONFLICT(id_week, tipo, orden) target stops matching any constraint
 * once this index replaces the table UNIQUE.
 *
 * Usage:
 *   tsx scripts/migrate-sala-unique-index.ts --db <path|url>
 *   tsx scripts/migrate-sala-unique-index.ts --prod   (TURSO_URL/TURSO_TOKEN from .env)
 */

export type SalaUniqueIndexMigrationClient = ReturnType<typeof createClient>;

const UNIQUE_INDEX_NAME = 'ux_part_week_tipo_orden_sala';

const REBUILT_PART_TABLE_SQL = `
  CREATE TABLE presentation_part_new (
    id_part INTEGER PRIMARY KEY AUTOINCREMENT,
    id_week INTEGER NOT NULL,
    orden INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN
      ('lectura_biblia','empiece_conversaciones','haga_revisitas','haga_discipulos','discurso','que_diria','explique_sus_creencias')),
    seccion TEXT NOT NULL CHECK(seccion IN ('TESOROS_DE_LA_BIBLIA','SEAMOS_MEJORES_MAESTROS')),
    duracion_min INTEGER NOT NULL CHECK(duracion_min > 0),
    escenario TEXT CHECK(escenario IS NULL OR escenario IN
      ('DE_CASA_EN_CASA','PREDICACION_INFORMAL','PREDICACION_PUBLICA')),
    fuente TEXT NOT NULL,
    leccion INTEGER,
    punto TEXT,
    sala TEXT CHECK(sala IS NULL OR sala IN ('A','B')),
    FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
  )
`;

const PART_COLUMNS =
  'id_part, id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto, sala';

async function tableExists(client: SalaUniqueIndexMigrationClient, table: string): Promise<boolean> {
  const result = await client.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [table],
  });
  return result.rows.length > 0;
}

/**
 * True when sqlite_master already holds ux_part_week_tipo_orden_sala with a
 * COALESCE expression (upper-cased compare: SQLite stores the CREATE text
 * as typed, but we do not want case to decide migration state).
 */
async function alreadyMigrated(client: SalaUniqueIndexMigrationClient): Promise<boolean> {
  if (!(await tableExists(client, 'presentation_part'))) {
    throw new Error('Tabla presentation_part no encontrada: la migración requiere el esquema previo');
  }
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?",
    args: [UNIQUE_INDEX_NAME],
  });
  if (result.rows.length === 0) return false;
  const sql = (result.rows[0] as unknown as { sql: string | null }).sql ?? '';
  return sql.toUpperCase().includes('COALESCE');
}

async function rowCount(client: SalaUniqueIndexMigrationClient, table: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number((result.rows[0] as unknown as { count: number }).count);
}

/**
 * Rebuilds presentation_part without the table-level UNIQUE and creates the
 * sala-aware expression unique index. Returns `true` when the rebuild ran,
 * `false` when the index was already in place (no-op).
 */
export async function ensureSalaUniqueIndex(
  client: SalaUniqueIndexMigrationClient
): Promise<boolean> {
  if (await alreadyMigrated(client)) return false;

  // foreign_keys is a no-op inside a transaction, so it must be toggled first.
  await client.execute('PRAGMA foreign_keys = OFF');
  await client.execute('BEGIN');

  try {
    await client.execute(REBUILT_PART_TABLE_SQL);
    await client.execute(`
      INSERT INTO presentation_part_new (${PART_COLUMNS})
      SELECT ${PART_COLUMNS} FROM presentation_part
    `);

    const source = await rowCount(client, 'presentation_part');
    const copied = await rowCount(client, 'presentation_part_new');
    if (source !== copied) {
      throw new Error(`Copia de datos incompleta: ${source} filas originales, ${copied} copiadas`);
    }

    await client.execute('DROP TABLE presentation_part');
    await client.execute('ALTER TABLE presentation_part_new RENAME TO presentation_part');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_part_week ON presentation_part(id_week)');
    await client.execute(
      `CREATE UNIQUE INDEX ${UNIQUE_INDEX_NAME} ON presentation_part(id_week, tipo, orden, COALESCE(sala, ''))`
    );

    const violations = await client.execute('PRAGMA foreign_key_check');
    if (violations.rows.length > 0) {
      throw new Error(`foreign_key_check detectó ${violations.rows.length} violacion(es); se revierte`);
    }

    await client.execute('COMMIT');
  } catch (error) {
    try {
      await client.execute('ROLLBACK');
    } catch {
      // Transaction may not have started; ignore rollback failure.
    }
    throw error;
  } finally {
    await client.execute('PRAGMA foreign_keys = ON');
  }

  return true;
}

function loadEnvFile(): Record<string, string> {
  const envPath = existsSync(join(process.cwd(), '.env.local'))
    ? join(process.cwd(), '.env.local')
    : join(process.cwd(), '.env');
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

function resolveTarget(): { url: string; authToken?: string } {
  const dbFlagIdx = process.argv.indexOf('--db');
  const wantsProd = process.argv.includes('--prod');

  if (dbFlagIdx !== -1 && wantsProd) {
    throw new Error('Pass either --db or --prod, not both');
  }
  if (dbFlagIdx !== -1) {
    const raw = process.argv[dbFlagIdx + 1];
    if (!raw) throw new Error('--db requires a path or URL');
    const url = raw.startsWith('file:') || raw.startsWith('libsql://') ? raw : `file:${raw}`;
    return { url };
  }
  if (wantsProd) {
    const envVars = loadEnvFile();
    const url = envVars.TURSO_URL || process.env.TURSO_URL;
    const token = envVars.TURSO_TOKEN || process.env.TURSO_TOKEN;
    if (!url?.startsWith('libsql://') || !token) {
      throw new Error('--prod requires TURSO_URL (libsql://) and TURSO_TOKEN in .env');
    }
    return { url, authToken: token };
  }
  throw new Error('No target: pass --db <path|url> or --prod');
}

async function main(): Promise<void> {
  const { url, authToken } = resolveTarget();
  const client = authToken ? createClient({ url, authToken }) : createClient({ url });
  console.log(`🎯 Target: ${url}`);

  const before = await rowCount(client, 'presentation_part');
  const applied = await ensureSalaUniqueIndex(client);

  if (!applied) {
    console.log(`ℹ️  ${UNIQUE_INDEX_NAME} ya existe (COALESCE). Nada que hacer.`);
  } else {
    const after = await rowCount(client, 'presentation_part');
    console.log(
      `✅ UNIQUE de tabla reemplazado por ${UNIQUE_INDEX_NAME} (filas: ${before} → ${after})`
    );
  }
  client.close();
}

// Direct-run guard (migrate-presentation-types.ts precedent) so unit tests can
// import ensureSalaUniqueIndex without triggering main()'s target resolution.
const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error('❌ Error fatal en migración:', err);
    process.exit(1);
  });
}
