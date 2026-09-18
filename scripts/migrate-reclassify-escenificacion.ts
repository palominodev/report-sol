import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Idempotent migration: reclassifies parts that were seeded as `discurso` with
 * an "Escenificación" source label into the real `escenificacion` tipo.
 *
 * Scope (accepted exception at apply): `fuente LIKE '%Escenificación%' AND
 * tipo='discurso'` — not week-scoped, so any future escenificación-labeled
 * discurso is also corrected. Idempotent by construction: after the UPDATE the
 * `tipo='discurso'` predicate no longer matches, so re-runs change nothing.
 *
 * The core logic is exported so in-memory tests can drive the same path
 * (`scripts/__tests__/migrate-reclassify-escenificacion.test.ts`).
 */

export type ReclassifyMigrationClient = ReturnType<typeof createClient>;

/**
 * Reclassifies discurso parts labeled as escenificación. Returns the number of
 * rows updated (0 on re-runs, i.e. idempotent).
 */
export async function reclassifyEscenificacionParts(
  client: ReclassifyMigrationClient
): Promise<number> {
  const result = await client.execute({
    sql: `UPDATE presentation_part
          SET tipo = 'escenificacion'
          WHERE fuente LIKE '%Escenificación%' AND tipo = 'discurso'`,
    args: [],
  });
  return Number(result.rowsAffected ?? 0);
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

  console.log('🚀 Iniciando reclasificación de partes tipo discurso con fuente "Escenificación"...');

  const updated = await reclassifyEscenificacionParts(client);
  if (updated === 0) {
    console.log('ℹ️  No hay partes discurso con fuente "Escenificación". Nada que hacer.');
    return;
  }

  console.log(`✅ Reclasificadas ${updated} parte(s) a tipo escenificacion.`);
}

const isDirectRun = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err: unknown) => {
    console.error('❌ Error fatal en migración:', err);
    process.exit(1);
  });
}