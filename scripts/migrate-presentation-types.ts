import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Idempotent migration: widens the `presentation_part.tipo` CHECK constraint to
 * also accept `escenificacion` AND `que_diria`.
 *
 * SQLite cannot ALTER a CHECK constraint, so the only safe path is a single
 * table rebuild: CREATE-COPY-DROP-RENAME with `PRAGMA foreign_keys = OFF` (so
 * dropping the parent does not cascade into `presentation_assignment` rows),
 * all inside one transaction, verified with `PRAGMA foreign_key_check` before
 * COMMIT. The rebuilt table keeps the `presentation_part` name, so the child
 * table's foreign key resolves again after the rename.
 *
 * The core logic is exported so in-memory tests can drive the same path
 * (`scripts/__tests__/migrate-presentation-types.test.ts`).
 */

export type PresentationTypesMigrationClient = ReturnType<typeof createClient>;

const NEW_TIPOS_IN_CHECK = ["'escenificacion'", "'que_diria'"];

const REBUILT_PART_TABLE_SQL = `
CREATE TABLE presentation_part_new (
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
)
`;

const PART_COLUMNS =
  'id_part, id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto';

async function alreadyWidened(client: PresentationTypesMigrationClient): Promise<boolean> {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'presentation_part'",
    args: [],
  });
  if (result.rows.length === 0) {
    throw new Error('Tabla presentation_part no encontrada: la migración requiere el esquema previo');
  }
  const sql = (result.rows[0] as unknown as { sql: string }).sql;
  return NEW_TIPOS_IN_CHECK.every((token) => sql.includes(token));
}

/**
 * Rebuilds `presentation_part` with the widened CHECK. Returns `true` when the
 * rebuild ran, `false` when the constraint was already widened (no-op).
 */
export async function rebuildPresentationPartCheck(
  client: PresentationTypesMigrationClient
): Promise<boolean> {
  if (await alreadyWidened(client)) return false;

  // foreign_keys is a no-op inside a transaction, so it must be toggled first.
  await client.execute('PRAGMA foreign_keys = OFF');
  await client.execute('BEGIN');

  try {
    await client.execute(REBUILT_PART_TABLE_SQL);
    await client.execute(`
      INSERT INTO presentation_part_new (${PART_COLUMNS})
      SELECT ${PART_COLUMNS} FROM presentation_part
    `);

    const sourceCount = await client.execute('SELECT COUNT(*) AS count FROM presentation_part');
    const copiedCount = await client.execute('SELECT COUNT(*) AS count FROM presentation_part_new');
    const source = Number((sourceCount.rows[0] as unknown as { count: number }).count);
    const copied = Number((copiedCount.rows[0] as unknown as { count: number }).count);
    if (source !== copied) {
      throw new Error(`Copia de datos incompleta: ${source} filas originales, ${copied} copiadas`);
    }

    await client.execute('DROP TABLE presentation_part');
    await client.execute('ALTER TABLE presentation_part_new RENAME TO presentation_part');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_part_week ON presentation_part(id_week)');

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

async function main(): Promise<void> {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL || process.env.TURSO_URL;
  const token = envVars.TURSO_TOKEN || process.env.TURSO_TOKEN;

  if (!url) {
    throw new Error('TURSO_URL no encontrado en variables de entorno');
  }

  const client = createClient({ url, authToken: token });

  console.log('🚀 Iniciando migración del CHECK de presentation_part...');

  const rebuilt = await rebuildPresentationPartCheck(client);
  if (!rebuilt) {
    console.log('ℹ️  El CHECK ya acepta escenificacion y que_diria. Nada que hacer.');
    return;
  }

  console.log('✅ CHECK de presentation_part ampliado (escenificacion, que_diria) mediante rebuild de tabla.');
}

const isDirectRun = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error('❌ Error fatal en migración:', err);
    process.exit(1);
  });
}