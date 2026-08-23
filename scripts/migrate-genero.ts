import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Idempotent migration: adds the `genero` column to `usuario` if it is missing.
 *
 * Mirrors migrate-user-roles.ts: loads its own .env/.env.local, opens a client
 * from TURSO_URL/TURSO_TOKEN, checks PRAGMA table_info(usuario), and only then
 * runs ALTER TABLE ... ADD COLUMN. NULL is allowed; values are backfilled via the UI.
 */
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

async function hasGeneroColumn(client: ReturnType<typeof createClient>): Promise<boolean> {
  const result = await client.execute('PRAGMA table_info(usuario)');
  return result.rows.some((row) => (row as unknown as { name: string }).name === 'genero');
}

async function migrateGenero(): Promise<void> {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL || process.env.TURSO_URL;
  const token = envVars.TURSO_TOKEN || process.env.TURSO_TOKEN;

  if (!url) {
    throw new Error('TURSO_URL no encontrado en variables de entorno');
  }

  const client = createClient({ url, authToken: token });

  console.log('🚀 Iniciando migración de la columna genero...');

  if (await hasGeneroColumn(client)) {
    console.log('ℹ️  La columna "genero" ya existe en usuario. Nada que hacer.');
    return;
  }

  await client.execute(`
    ALTER TABLE usuario
    ADD COLUMN genero TEXT CHECK(genero IN ('masculino','femenino'))
  `);

  console.log('✅ Columna "genero" agregada a usuario (NULL permitido, se rellena por la UI).');
}

migrateGenero().catch((err: unknown) => {
  console.error('❌ Error fatal en migración:', err);
  process.exit(1);
});