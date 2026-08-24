import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { syncMeetingWorkbook } from '../src/infrastructure/scraper/sync-service';

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

function initEnv(): void {
  const envVars = loadEnvFile();
  if (!process.env.TURSO_URL && envVars.TURSO_URL) {
    process.env.TURSO_URL = envVars.TURSO_URL;
  }
  if (!process.env.TURSO_TOKEN && envVars.TURSO_TOKEN) {
    process.env.TURSO_TOKEN = envVars.TURSO_TOKEN;
  }

  if (!process.env.TURSO_URL) {
    const localDb = join(process.cwd(), 'data', 'local.db');
    process.env.TURSO_URL = `file:${localDb}`;
    console.log(`💻 Modo local: usando ${process.env.TURSO_URL}`);
  }
}

function parseArgs(): { issue?: string } {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--issue' || args[i] === '-i') {
      return { issue: args[i + 1] };
    }
  }
  return {};
}

async function main() {
  initEnv();
  const { issue } = parseArgs();

  console.log('📖 Iniciando sincronización de la Guía de Actividades Vida y Ministerio...');
  if (issue) {
    console.log(`🎯 Edición solicitada: ${issue}`);
  } else {
    console.log('🌐 Buscando última edición publicada en jw.org...');
  }

  try {
    const result = await syncMeetingWorkbook({ issue });
    console.log('\n✅ ¡Sincronización completada exitosamente!');
    console.log(`   - Edición: ${result.issue}`);
    console.log(`   - Semanas importadas: ${result.weeksLoaded}`);
    console.log(`   - Asignaciones/Partes importadas: ${result.partsLoaded}`);
  } catch (error) {
    console.error('\n❌ Error al sincronizar la Guía de Actividades:', error);
    process.exit(1);
  }
}

main();
