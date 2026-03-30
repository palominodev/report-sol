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
    return { url: url.trim(), token: token.trim(), isLocal: false };
  }

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

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return parseInt(value, 10);
  return 0;
}

const GROUP_NAMES = ['Grupo A', 'Grupo B', 'Grupo C'];

const USUARIOSPorGrupo = [
  ['Juan', 'Pérez'], ['María', 'García'], ['Carlos', 'López'], ['Ana', 'Martínez'],
  ['Luis', 'Rodríguez'], ['Sofia', 'Hernández'], ['Miguel', 'González'], ['Elena', 'Álvarez'],
  ['David', 'Torres'], ['Laura', 'Ramírez']
];

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed(client: DatabaseClient) {
  console.log('🌱 Iniciando seed de datos...\n');

  console.log('📦 Insertando grupos...');
  for (const nombre of GROUP_NAMES) {
    try {
      await client.execute({ sql: `INSERT INTO grupo (nombre) VALUES (?)`, args: [nombre] });
    } catch (e: unknown) {
      // Ignore duplicate
    }
  }
  console.log(`  ✅ Grupos creados/verificados`);

  const gruposResult = await client.execute('SELECT id_grupo, nombre FROM grupo');
  const gruposList: { nombre: string; id: number }[] = [];
  for (const g of gruposResult.rows) {
    gruposList.push({ nombre: g.nombre as string, id: toNumber(g.id_grupo) });
  }

  console.log('👥 Insertando usuarios...');
  
  for (let i = 0; i < gruposList.length; i++) {
    const grupo = gruposList[i];
    const id_grupo = grupo.id;
    
    for (let j = 0; j < USUARIOSPorGrupo.length; j++) {
      const [nombre, apellido] = USUARIOSPorGrupo[j];
      const usuarioIndex = i * 10 + j;
      const nombreCompleto = `${nombre}${usuarioIndex}`;
      
      // Insert or get user
      try {
        await client.execute({
          sql: `INSERT INTO usuario (nombre, apellido) VALUES (?, ?)`,
          args: [nombreCompleto, apellido]
        });
      } catch (e: unknown) {
        // User might already exist, continue
      }
      
      // Get user ID
      const userResult = await client.execute({
        sql: `SELECT id_usuario FROM usuario WHERE nombre = ?`,
        args: [nombreCompleto]
      });
      
      if (userResult.rows.length === 0) continue;
      
      const id_usuario = toNumber(userResult.rows[0].id_usuario);
      
      // Assign to group
      const rol = j === 0 ? 'encargado' : j === 1 ? 'auxiliar' : 'miembro';
      try {
        await client.execute({
          sql: `INSERT INTO grupo_usuario (id_grupo, id_usuario, rol_en_grupo) VALUES (?, ?, ?)`,
          args: [id_grupo, id_usuario, rol]
        });
      } catch (e: unknown) {
        // Already assigned, continue
      }
    }
  }
  console.log(`  ✅ Usuarios creados/verificados`);

  console.log('📊 Insertando informes...');
  
  const existingInformes = await client.execute('SELECT COUNT(*) as count FROM informe');
  const existingCount = toNumber(existingInformes.rows[0]?.count);
  
  if (existingCount > 0) {
    console.log(`  ⏭️  Ya existen ${existingCount} informes, omitiendo inserción`);
    console.log('✅ Seed completado correctamente');
    return;
  }

  const usuarios = await client.execute(`
    SELECT u.id_usuario FROM usuario u
    JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
  `);

  let informeCount = 0;
  for (const u of usuarios.rows) {
    const id_usuario = toNumber(u.id_usuario);
    
    for (let i = 0; i < 3; i++) {
      const mes = randomElement(MESES);
      const año = randomInt(2024, 2025);
      const cursos = randomInt(1, 10);
      const horas = randomInt(10, 80);
      const participacion = Math.random() > 0.2;
      const trabajo_como_auxiliar = Math.random() > 0.7;

      try {
        await client.execute({
          sql: `INSERT INTO informe (mes, año, cursos, horas, participacion, trabajo_como_auxiliar, id_usuario) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [mes, año, cursos, horas, participacion ? 1 : 0, trabajo_como_auxiliar ? 1 : 0, id_usuario]
        });
        informeCount++;
      } catch (e: unknown) {
        // Skip duplicate or error
      }
    }
  }
  console.log(`  ✅ ${informeCount} informes creados`);

  console.log('\n✅ Seed completado correctamente');
}

async function main() {
  const envVars = loadEnvFile();
  const hasTursoCredentials = envVars.TURSO_URL?.trim() && envVars.TURSO_TOKEN?.trim();

  if (hasTursoCredentials) {
    console.error('❌ ERROR: No puedes ejecutar seed en producción (Turso)');
    console.error('');
    console.error('El script de seed está configurado para usar solo base de datos local.');
    console.error('Para ejecutar seed, asegurate de que .env.local NO tenga:');
    console.error('  - TURSO_URL');
    console.error('  - TURSO_TOKEN');
    console.error('');
    console.error('O elimina/renombra temporalmente .env.local');
    process.exit(1);
  }

  console.log('💻 Modo desarrollo: usando SQLite local...\n');

  const config = loadEnvConfig();
  const client = getDatabaseClient(config);

  try {
    await seed(client);
    console.log(`📁 Base de datos: ${config.url.replace('file:', '')}`);
  } catch (error) {
    console.error('❌ Error durante seed:', error);
    process.exit(1);
  }
}

main();
