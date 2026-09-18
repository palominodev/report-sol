import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

type DatabaseClient = ReturnType<typeof createClient>;

interface EnvConfig {
  url: string;
  token: string;
  isLocal: boolean;
}

function loadEnvFile(fileName: '.env' | '.env.local'): Record<string, string> {
  const envPath = join(process.cwd(), fileName);
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

/**
 * Target resolution is DELIBERATE:
 * - default (no flag): local SQLite at data/local.db
 * - --prod: remote Turso using credentials from .env (production)
 * The target is NEVER inferred from .env.local.
 */
function loadEnvConfig(): EnvConfig {
  const wantsProd = process.argv.includes('--prod');

  if (wantsProd) {
    const envVars = loadEnvFile('.env');
    const url = envVars.TURSO_URL;
    const token = envVars.TURSO_TOKEN;

    if (!url || !url.startsWith('libsql://') || !token) {
      throw new Error('--prod requires TURSO_URL (libsql://) and TURSO_TOKEN in .env');
    }
    console.log(`🌐 PRODUCCIÓN: ${url}`);
    return { url, token, isLocal: false };
  }

  console.log('💻 Modo desarrollo: usando SQLite local...');
  const localPath = join(process.cwd(), 'data', 'local.db');
  return {
    url: `file:${localPath}`,
    token: '',
    isLocal: true,
  };
}

function getDatabaseClient(config: EnvConfig): DatabaseClient {
  return createClient({
    url: config.url,
    authToken: config.token || undefined,
  });
}

/** True only for errors that make a re-run of the schema idempotent
 * (object already exists, or seed row already inserted). */
function isIdempotentError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  const message = err.message || '';
  return (
    message.includes('already exists') ||
    message.includes('UNIQUE constraint failed')
  );
}

async function executeSqlFile(client: DatabaseClient, filePath: string): Promise<void> {
  const sql = readFileSync(filePath, 'utf-8');
  const lines = sql.split('\n').filter(line => !line.trim().startsWith('--'));
  const cleanSql = lines.join('\n');

  const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);

  console.log(`📋 Ejecutando ${statements.length} statements...`);

  let skipped = 0;
  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (error: unknown) {
      if (isIdempotentError(error)) {
        skipped++;
        const preview = statement.replace(/\s+/g, ' ').slice(0, 70);
        console.log(`↩️  skip (ya existe): ${preview}...`);
        continue;
      }
      const err = error as Error;
      throw new Error(
        `Statement fallido: ${err.message}\n--- SQL ---\n${statement.slice(0, 500)}`
      );
    }
  }
  if (skipped > 0) console.log(`ℹ️  ${skipped} statements omitidos por idempotencia`);
}

async function main() {
  const config = loadEnvConfig();
  const client = getDatabaseClient(config);

  const schemaPath = join(process.cwd(), 'src', 'db.sql');
  console.log(`📄 Leyendo schema desde: ${schemaPath}`);

  try {
    await executeSqlFile(client, schemaPath);
    console.log('✅ Schema ejecutado correctamente');
  } catch (error: unknown) {
    console.error('❌ Error al ejecutar schema:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (config.isLocal) {
    console.log(`📁 Base de datos local: ${config.url.replace('file:', '')}`);
  }
}

main();
