import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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

async function main() {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL;
  const token = envVars.TURSO_TOKEN;

  if (!url || !token || !url.trim() || !token.trim()) {
    console.log('❌ No hay conexión a Turso configurada');
    return;
  }

  const client = createClient({ url, authToken: token });

  console.log('📊 Consultando registros en producción...\n');

  const gruposCount = await client.execute('SELECT COUNT(*) as c FROM grupo WHERE nombre LIKE "Grupo %"');
  const usuariosCount = await client.execute('SELECT COUNT(*) as c FROM usuario WHERE nombre LIKE "Juan%" OR nombre LIKE "María%" OR nombre LIKE "Carlos%" OR nombre LIKE "Ana%" OR nombre LIKE "Luis%" OR nombre LIKE "Sofia%" OR nombre LIKE "Miguel%" OR nombre LIKE "Elena%" OR nombre LIKE "David%" OR nombre LIKE "Laura%"');
  const informesCount = await client.execute('SELECT COUNT(*) as c FROM informe');
  const grupoUsuarioCount = await client.execute('SELECT COUNT(*) as c FROM grupo_usuario gu JOIN usuario u ON gu.id_usuario = u.id_usuario WHERE u.nombre LIKE "Juan%" OR u.nombre LIKE "María%" OR u.nombre LIKE "Carlos%" OR u.nombre LIKE "Ana%" OR u.nombre LIKE "Luis%" OR u.nombre LIKE "Sofia%" OR u.nombre LIKE "Miguel%" OR u.nombre LIKE "Elena%" OR u.nombre LIKE "David%" OR u.nombre LIKE "Laura%"');

  console.log('Registros a eliminar:');
  console.log(`  - Grupos (Grupo A, B, C): ${gruposCount.rows[0]?.c || 0}`);
  console.log(`  - Usuarios seed: ${usuariosCount.rows[0]?.c || 0}`);
  console.log(`  - Grupo-Usuario: ${grupoUsuarioCount.rows[0]?.c || 0}`);
  console.log(`  - Informes: ${informesCount.rows[0]?.c || 0}`);
  console.log('\n⚠️  ESTO ELIMINARÁ TODOS LOS DATOS DE PRODUCCIÓN');
  console.log('Ejecuta este script con: npm run db:cleanup');
}

main();
