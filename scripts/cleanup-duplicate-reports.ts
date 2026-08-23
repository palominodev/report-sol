import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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

interface ReportRow {
  id_informe: number;
  id_usuario: number;
  usuario_nombre: string;
  año: number;
  mes: string;
  horas: number | null;
  cursos: number;
  participacion: number;
  trabajo_como_auxiliar: number;
  notas: string | null;
  fecha_registro: string;
}

function pickBestRecord(list: ReportRow[]): ReportRow {
  return list.slice().sort((a, b) => {
    // 1. Prioridad: ¿Tiene notas explicativas ingresadas por usuario?
    const aHasNotes = a.notas && a.notas.trim().length > 0 ? 1 : 0;
    const bHasNotes = b.notas && b.notas.trim().length > 0 ? 1 : 0;
    if (aHasNotes !== bHasNotes) return bHasNotes - aHasNotes;

    // 2. Prioridad: ¿Tiene horas > 0?
    const aHours = a.horas || 0;
    const bHours = b.horas || 0;
    if ((aHours > 0) !== (bHours > 0)) return (bHours > 0 ? 1 : 0) - (aHours > 0 ? 1 : 0);

    // 3. Prioridad: Fecha de registro más reciente
    if (a.fecha_registro !== b.fecha_registro) {
      return b.fecha_registro.localeCompare(a.fecha_registro);
    }

    // 4. Prioridad: Mayor cantidad de horas
    if (aHours !== bHours) return bHours - aHours;

    // 5. Desempate: Mayor ID
    return b.id_informe - a.id_informe;
  })[0];
}

async function cleanupDuplicateReports() {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL || process.env.TURSO_URL;
  const token = envVars.TURSO_TOKEN || process.env.TURSO_TOKEN;

  if (!url) throw new Error('TURSO_URL no encontrado');

  const client = createClient({ url, authToken: token });

  console.log('🚀 Iniciando depuración de informes duplicados en Turso...');

  // 1. Obtener todos los informes duplicados
  const query = `
    SELECT 
      i.id_informe,
      i.id_usuario,
      u.nombre || ' ' || u.apellido as usuario_nombre,
      i.año,
      i.mes,
      i.horas,
      i.cursos,
      i.participacion,
      i.trabajo_como_auxiliar,
      i.notas,
      i.fecha_registro
    FROM informe i
    JOIN usuario u ON i.id_usuario = u.id_usuario
    WHERE (i.id_usuario, i.año, i.mes) IN (
      SELECT id_usuario, año, mes
      FROM informe
      GROUP BY id_usuario, año, mes
      HAVING count(*) > 1
    )
    ORDER BY u.apellido, u.nombre, i.año DESC, i.mes, i.fecha_registro DESC
  `;

  const result = await client.execute(query);
  const rows = result.rows as unknown as ReportRow[];

  console.log(`📋 Total registros involucrados en duplicidad: ${rows.length}`);

  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const key = `${row.id_usuario}__${row.año}__${row.mes}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  console.log(`👥 Total grupos (usuario + año + mes) a unificar: ${groups.size}`);

  const idsToDelete: number[] = [];

  for (const [, list] of groups.entries()) {
    const best = pickBestRecord(list);
    const toDelete = list.filter((r) => r.id_informe !== best.id_informe);
    for (const d of toDelete) {
      idsToDelete.push(d.id_informe);
    }
  }

  console.log(`🗑️  Total informes redundantes a eliminar: ${idsToDelete.length}`);

  // 2. Eliminar en lotes para no sobrecargar
  const BATCH_SIZE = 50;
  let deletedCount = 0;

  for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
    const chunk = idsToDelete.slice(i, i + BATCH_SIZE);
    const placeholders = chunk.map(() => '?').join(',');
    const delRes = await client.execute({
      sql: `DELETE FROM informe WHERE id_informe IN (${placeholders})`,
      args: chunk,
    });
    deletedCount += delRes.rowsAffected;
  }

  console.log(`✅ Eliminados ${deletedCount} registros duplicados.`);

  // 3. Crear índice UNIQUE en la base de datos
  console.log('🔒 Creando índice UNIQUE en tabla informe (id_usuario, año, mes)...');
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_informe_usuario_periodo 
    ON informe(id_usuario, año, mes);
  `);
  console.log('✅ Índice UNIQUE creado exitosamente.');

  // 4. Verificación de integridad final
  console.log('🔍 Verificando integridad post-depuración...');
  const checkDups = await client.execute(`
    SELECT id_usuario, año, mes, count(*) as count
    FROM informe
    GROUP BY id_usuario, año, mes
    HAVING count > 1
  `);

  if (checkDups.rows.length > 0) {
    console.error('❌ Aún existen duplicados:', checkDups.rows);
    process.exit(1);
  } else {
    const totalFinal = await client.execute('SELECT count(*) as total FROM informe');
    console.log(`🎯 Integridad 100% verificada: 0 informes duplicados.`);
    console.log(`📊 Total final de informes en base de datos: ${totalFinal.rows[0].total}`);
  }
}

cleanupDuplicateReports().catch((err) => {
  console.error('❌ Error en depuración:', err);
  process.exit(1);
});
