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

async function cleanupUsers() {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL || process.env.TURSO_URL;
  const token = envVars.TURSO_TOKEN || process.env.TURSO_TOKEN;

  if (!url) {
    throw new Error('TURSO_URL no encontrado');
  }

  const client = createClient({ url, authToken: token });

  console.log('🚀 Iniciando corrección de datos de usuarios en Turso...');

  // 1. Unificar Valentina Valencia (ID 83 -> ID 149)
  const u83 = await client.execute('SELECT * FROM usuario WHERE id_usuario = 83');
  const u149 = await client.execute('SELECT * FROM usuario WHERE id_usuario = 149');

  if (u83.rows.length > 0 && u149.rows.length > 0) {
    console.log('1. Unificando Valentina Valencia (ID 83 -> ID 149)...');
    
    // Transferir informes de 83 a 149
    const infTrans = await client.execute({
      sql: 'UPDATE informe SET id_usuario = 149 WHERE id_usuario = 83',
      args: [],
    });
    console.log(`   - Informes transferidos de ID 83 a ID 149: ${infTrans.rowsAffected}`);

    // Eliminar relaciones de 83
    await client.execute({ sql: 'DELETE FROM usuario_rol WHERE id_usuario = 83', args: [] });
    await client.execute({ sql: 'DELETE FROM grupo_usuario WHERE id_usuario = 83', args: [] });
    
    // Eliminar usuario 83
    await client.execute({ sql: 'DELETE FROM usuario WHERE id_usuario = 83', args: [] });
    console.log('   - Registro duplicado ID 83 eliminado exitosamente.');
  } else {
    console.log('ℹ️  Valentina Valencia ya no tiene duplicado (ID 83 no encontrado).');
  }

  // 2. Corregir Medina Eusebio (ID 126)
  const u126 = await client.execute('SELECT * FROM usuario WHERE id_usuario = 126');
  if (u126.rows.length > 0 && u126.rows[0].nombre === 'Medina' && u126.rows[0].apellido === 'Eusebio') {
    console.log('2. Invirtiendo nombre/apellido de ID 126 (Medina Eusebio -> Eusebio Medina)...');
    await client.execute({
      sql: "UPDATE usuario SET nombre = 'Eusebio', apellido = 'Medina' WHERE id_usuario = 126",
      args: [],
    });
    console.log('   - ID 126 actualizado a "Eusebio Medina".');
  }

  // 3. Limpiar espacios en blanco (TRIM y espacios dobles)
  console.log('3. Limpiando espacios en blanco en todos los nombres y apellidos...');
  const allUsers = await client.execute('SELECT id_usuario, nombre, apellido FROM usuario');
  let trimmedCount = 0;

  for (const u of allUsers.rows) {
    const id = u.id_usuario as number;
    const nomOriginal = u.nombre as string;
    const apeOriginal = u.apellido as string;

    const nomClean = nomOriginal.replace(/\s+/g, ' ').trim();
    const apeClean = apeOriginal.replace(/\s+/g, ' ').trim();

    if (nomOriginal !== nomClean || apeOriginal !== apeClean) {
      console.log(`   - Corrigiendo ID ${id}: "${nomOriginal}" "${apeOriginal}" -> "${nomClean}" "${apeClean}"`);
      await client.execute({
        sql: 'UPDATE usuario SET nombre = ?, apellido = ? WHERE id_usuario = ?',
        args: [nomClean, apeClean, id],
      });
      trimmedCount++;
    }
  }
  console.log(`   - Total de registros con espacios corregidos: ${trimmedCount}`);

  // 4. Verificación final
  console.log('----------------------------------------------------');
  const remainingCheck = await client.execute(`
    SELECT id_usuario, nombre, apellido 
    FROM usuario 
    WHERE nombre != TRIM(nombre) OR apellido != TRIM(apellido) OR nombre LIKE '%  %' OR apellido LIKE '%  %'
  `);

  console.log(`🔍 Registros con problemas de espacios restantes: ${remainingCheck.rows.length}`);
  const totalUsers = await client.execute('SELECT COUNT(*) as total FROM usuario');
  console.log(`👥 Total de usuarios en el sistema: ${totalUsers.rows[0].total}`);
  console.log('✅ Corrección de datos de usuario completada con éxito.');
}

cleanupUsers().catch((err) => {
  console.error('❌ Error durante la limpieza:', err);
  process.exit(1);
});
