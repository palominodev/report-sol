import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Dual-sala mirror schema migration (DOWN): restores the pre-mirror
 * table-level UNIQUE(id_week, tipo, orden) of presentation_part and removes
 * the expression unique index ux_part_week_tipo_orden_sala.
 *
 * The up-migration allows Sala A/B twins per (id_week, tipo, orden); the
 * plain constraint cannot hold them, so this script first de-duplicates
 * every (id_week, tipo, orden) group keeping ONE row by priority:
 *   1. a row carrying a manual assignment (estado = 'manual')
 *   2. sala = 'A'
 *   3. sala IS NULL
 *   4. sala = 'B'
 * Ties inside the same priority break by lowest id_part (deterministic).
 *
 * ⚠️ CASCADE LOSS ON DELETED TWINS: presentation_assignment rows attached
 * to the DELETED twins are removed too — assignments are per-part, and a
 * B clone's assignments cannot be re-attached to the kept row. This loss
 * is accepted by design. Forward-fix: re-run the sala adoption flow
 * (AdoptSalaRoomsUseCase, idempotent) to rebuild the mirror, then
 * regenerate the week; manual assignments kept by this script survive.
 *
 * Atomicity: the de-dup DELETEs and the table rebuild share one
 * transaction, with foreign_keys OFF (rebuild precedent). Orphaned
 * assignments of deleted twins are removed EXPLICITLY first (there is no
 * FK enforcement mid-rebuild), so PRAGMA foreign_key_check stays clean
 * before COMMIT.
 *
 * Guarded and idempotent: no-ops when the expression index is already
 * gone and the plain UNIQUE is back. Exported so in-memory tests drive
 * the same path.
 *
 * Usage:
 *   tsx scripts/migrate-sala-unique-index-down.ts --db <path|url>
 *   tsx scripts/migrate-sala-unique-index-down.ts --prod
 */

export type SalaUniqueIndexDownMigrationClient = ReturnType<typeof createClient>;

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
    UNIQUE(id_week, tipo, orden),
    FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
  )
`;

const PART_COLUMNS =
  'id_part, id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto, sala';

/**
 * Keep-one ranking per (id_week, tipo, orden): manual-assignment row first,
 * then 'A', then NULL, then 'B'; ties by lowest id_part. rn = 1 survives.
 */
const RANKED_KEEPERS_CTE = `
  WITH ranked AS (
    SELECT p.id_part,
      ROW_NUMBER() OVER (
        PARTITION BY p.id_week, p.tipo, p.orden
        ORDER BY
          CASE WHEN EXISTS (
            SELECT 1 FROM presentation_assignment a
            WHERE a.id_part = p.id_part AND a.estado = 'manual'
          ) THEN 0 ELSE 1 END,
          CASE
            WHEN p.sala = 'A' THEN 1
            WHEN p.sala IS NULL THEN 2
            WHEN p.sala = 'B' THEN 3
            ELSE 4
          END,
          p.id_part
      ) AS rn
    FROM presentation_part p
  )
`;

const DELETE_NON_KEEPER_ASSIGNMENTS_SQL = `
  DELETE FROM presentation_assignment WHERE id_part IN (
    ${RANKED_KEEPERS_CTE}
    SELECT id_part FROM ranked WHERE rn > 1
  )
`;

const DELETE_NON_KEEPER_PARTS_SQL = `
  DELETE FROM presentation_part WHERE id_part IN (
    ${RANKED_KEEPERS_CTE}
    SELECT id_part FROM ranked WHERE rn > 1
  )
`;

async function partTableSql(client: SalaUniqueIndexDownMigrationClient): Promise<string> {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'presentation_part'",
    args: [],
  });
  if (result.rows.length === 0) {
    throw new Error('Tabla presentation_part no encontrada: la migración requiere el esquema previo');
  }
  return (result.rows[0] as unknown as { sql: string }).sql;
}

async function expressionIndexExists(client: SalaUniqueIndexDownMigrationClient): Promise<boolean> {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?",
    args: [UNIQUE_INDEX_NAME],
  });
  if (result.rows.length === 0) return false;
  const sql = (result.rows[0] as unknown as { sql: string | null }).sql ?? '';
  return sql.toUpperCase().includes('COALESCE');
}

async function hasPlainTableUnique(tableSql: string): Promise<boolean> {
  return tableSql.toUpperCase().includes('UNIQUE(ID_WEEK');
}

async function hasSalaColumn(client: SalaUniqueIndexDownMigrationClient): Promise<boolean> {
  const result = await client.execute('PRAGMA table_info(presentation_part)');
  return result.rows.some((row) => String(row.name) === 'sala');
}

async function rowCount(client: SalaUniqueIndexDownMigrationClient, table: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number((result.rows[0] as unknown as { count: number }).count);
}

/**
 * De-duplicates (id_week, tipo, orden) groups and rebuilds presentation_part
 * with the plain table UNIQUE. Returns `true` when the down ran, `false`
 * when the schema was already in pre-mirror shape (no-op).
 */
export async function restorePlainUniqueConstraint(
  client: SalaUniqueIndexDownMigrationClient
): Promise<{ ran: boolean; removedParts: number; removedAssignments: number }> {
  const tableSql = await partTableSql(client);
  if (!(await expressionIndexExists(client)) && (await hasPlainTableUnique(tableSql))) {
    return { ran: false, removedParts: 0, removedAssignments: 0 };
  }
  if (!(await hasSalaColumn(client))) {
    throw new Error(
      'presentation_part.sala no existe: ejecuta primero db-migrate-prod (Phase 2.5) y la migración UP'
    );
  }

  const partsBefore = await rowCount(client, 'presentation_part');
  const assignmentsBefore = await rowCount(client, 'presentation_assignment');

  // foreign_keys is a no-op inside a transaction, so it must be toggled first.
  await client.execute('PRAGMA foreign_keys = OFF');
  await client.execute('BEGIN');

  try {
    // Orphan cleanup MUST precede the twin delete: with FK enforcement off
    // there is no cascade, and the keeper ranking reads presentation_part.
    await client.execute(DELETE_NON_KEEPER_ASSIGNMENTS_SQL);
    await client.execute(DELETE_NON_KEEPER_PARTS_SQL);

    const deduped = await rowCount(client, 'presentation_part');

    await client.execute(REBUILT_PART_TABLE_SQL);
    await client.execute(`
      INSERT INTO presentation_part_new (${PART_COLUMNS})
      SELECT ${PART_COLUMNS} FROM presentation_part
    `);

    const copied = await rowCount(client, 'presentation_part_new');
    if (deduped !== copied) {
      throw new Error(`Copia de datos incompleta: ${deduped} filas a copiar, ${copied} copiadas`);
    }

    await client.execute('DROP TABLE presentation_part');
    await client.execute('ALTER TABLE presentation_part_new RENAME TO presentation_part');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_part_week ON presentation_part(id_week)');
    // The table drop already removed the expression index with the old
    // table; IF EXISTS keeps this explicit and re-run safe.
    await client.execute(`DROP INDEX IF EXISTS ${UNIQUE_INDEX_NAME}`);

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

  const partsAfter = await rowCount(client, 'presentation_part');
  const assignmentsAfter = await rowCount(client, 'presentation_assignment');
  return {
    ran: true,
    removedParts: partsBefore - partsAfter,
    removedAssignments: assignmentsBefore - assignmentsAfter,
  };
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

  const result = await restorePlainUniqueConstraint(client);

  if (!result.ran) {
    console.log(`ℹ️  Ya está en forma pre-mirror (UNIQUE de tabla, sin ${UNIQUE_INDEX_NAME}). Nada que hacer.`);
  } else {
    console.log(
      `✅ UNIQUE(id_week, tipo, orden) restaurado; ${UNIQUE_INDEX_NAME} eliminado. ` +
        `Partes eliminadas: ${result.removedParts}; asignaciones en cascada: ${result.removedAssignments}. ` +
        `Forward-fix para reconstruir el espejo: re-ejecutar la adopción de salas (idempotente).`
    );
  }
  client.close();
}

// Direct-run guard (migrate-presentation-types.ts precedent) so unit tests can
// import restorePlainUniqueConstraint without triggering main()'s target resolution.
const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error('❌ Error fatal en migración:', err);
    process.exit(1);
  });
}
