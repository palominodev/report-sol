import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Idempotent migration: adds the `familia_id` column (INTEGER, NULL-allowed) to
 * `usuario` if it is missing.
 *
 * Mirrors migrate-genero.ts: loads its own .env/.env.local, opens a client from
 * TURSO_URL/TURSO_TOKEN, checks PRAGMA table_info(usuario), and only then runs
 * ALTER TABLE ... ADD COLUMN. NULL = "not family" per the matching-rules spec;
 * values are backfilled later (out of scope).
 *
 * The core logic is exported so in-memory tests can drive the same path
 * (`scripts/__tests__/migrate-familia.test.ts`).
 */

export type FamiliaMigrationClient = ReturnType<typeof createClient>;

/**
 * Ensures `usuario.familia_id` exists. Returns `true` when the column was
 * added, `false` when it was already present (no-op).
 */
export async function ensureFamiliaIdColumn(client: FamiliaMigrationClient): Promise<boolean> {
  const info = await client.execute('PRAGMA table_info(usuario)');
  const hasColumn = (info.rows as unknown as { name: string }[]).some((row) => row.name === 'familia_id');

  if (hasColumn) return false;

  await client.execute(`
    ALTER TABLE usuario
    ADD COLUMN familia_id INTEGER
  `);

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

  console.log('🚀 Iniciando migración de la columna familia_id...');

  const added = await ensureFamiliaIdColumn(client);
  if (!added) {
    console.log('ℹ️  La columna "familia_id" ya existe en usuario. Nada que hacer.');
    return;
  }

  console.log('✅ Columna "familia_id" agregada a usuario (NULL permitido, se rellena más adelante).');
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error('❌ Error fatal en migración:', err);
    process.exit(1);
  });
}