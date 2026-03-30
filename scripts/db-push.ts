import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

type DatabaseClient = ReturnType<typeof createClient>;

interface EnvConfig {
  url: string;
  token: string;
  isLocal: boolean;
}

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

function loadEnvConfig(): EnvConfig {
  const envVars = loadEnvFile();
  
  const url = envVars.TURSO_URL;
  const token = envVars.TURSO_TOKEN;

  if (url && url.trim() && token && token.trim()) {
    console.log('🌐 Conectando a Turso (producción)...');
    return { url: url.trim(), token: token.trim(), isLocal: false };
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

async function executeSqlFile(client: DatabaseClient, filePath: string): Promise<void> {
  const sql = readFileSync(filePath, 'utf-8');
  const lines = sql.split('\n').filter(line => !line.trim().startsWith('--'));
  const cleanSql = lines.join('\n');
  
  const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  console.log(`📋 Ejecutando ${statements.length} statements...`);

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      
      if (err.code?.includes('CONSTRAINT') || err.message?.includes('UNIQUE') || err.message?.includes('already exists')) {
        continue;
      }
      
      if (err.code === 'SQLITE_ERROR') {
        continue;
      }
      
      throw error;
    }
  }
}

async function main() {
  const config = loadEnvConfig();
  const client = getDatabaseClient(config);

  const schemaPath = join(process.cwd(), 'src', 'db.sql');
  console.log(`📄 Leyendo schema desde: ${schemaPath}`);

  try {
    await executeSqlFile(client, schemaPath);
    console.log('✅ Schema ejecutado correctamente');
  } catch (error) {
    console.error('❌ Error al ejecutar schema:', error);
    process.exit(1);
  }

  if (config.isLocal) {
    console.log(`📁 Base de datos local: ${config.url.replace('file:', '')}`);
  }
}

main();
