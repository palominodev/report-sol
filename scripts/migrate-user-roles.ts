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

async function migrateUserRoles() {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL || process.env.TURSO_URL;
  const token = envVars.TURSO_TOKEN || process.env.TURSO_TOKEN;

  if (!url) {
    throw new Error('TURSO_URL no encontrado en variables de entorno');
  }

  const client = createClient({ url, authToken: token });

  console.log('🚀 Iniciando migración de roles de usuario...');

  // 1. Obtener mapeo de roles
  const rolesResult = await client.execute('SELECT id_rol, rol FROM rol');
  const roleMap: Record<string, number> = {};
  for (const row of rolesResult.rows) {
    roleMap[row.rol as string] = row.id_rol as number;
  }
  console.log('📋 Roles disponibles:', roleMap);

  const PREACHING_ROLES = ['regular', 'auxiliar', 'publicador'] as const; // en orden de prioridad

  // 2. Obtener todos los usuarios con sus roles
  const usersWithRoles = await client.execute(`
    SELECT u.id_usuario, u.nombre, u.apellido, GROUP_CONCAT(r.rol) as roles, GROUP_CONCAT(r.id_rol) as id_roles
    FROM usuario u
    LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    LEFT JOIN rol r ON ur.id_rol = r.id_rol
    GROUP BY u.id_usuario, u.nombre, u.apellido
  `);

  console.log(`👥 Total de usuarios a evaluar: ${usersWithRoles.rows.length}`);

  let updatedMixed = 0;
  let updatedMissing = 0;

  for (const user of usersWithRoles.rows) {
    const userId = user.id_usuario as number;
    const userName = `${user.nombre} ${user.apellido}`;
    const userRoles = user.roles ? (user.roles as string).split(',') : [];

    const preachingInUser = userRoles.filter(r => (PREACHING_ROLES as readonly string[]).includes(r));

    // Caso 1: Múltiples roles de predicación (ej. publicador, regular)
    if (preachingInUser.length > 1) {
      console.log(`⚠️  Usuario ${userName} (ID ${userId}) tiene roles mixtos: [${preachingInUser.join(', ')}]`);
      
      // Determinar el de mayor prioridad
      const highestPriorityRole = PREACHING_ROLES.find(r => preachingInUser.includes(r))!;
      const rolesToDelete = preachingInUser.filter(r => r !== highestPriorityRole);

      console.log(`   -> Conservando "${highestPriorityRole}" y eliminando: [${rolesToDelete.join(', ')}]`);

      for (const r of rolesToDelete) {
        const idRolToDelete = roleMap[r];
        await client.execute({
          sql: 'DELETE FROM usuario_rol WHERE id_usuario = ? AND id_rol = ?',
          args: [userId, idRolToDelete],
        });
      }
      updatedMixed++;
    }

    // Caso 2: Sin ningún rol de predicación
    if (preachingInUser.length === 0) {
      console.log(`ℹ️  Usuario ${userName} (ID ${userId}) no tiene rol de predicación. Asignando "publicador"...`);
      const publicadorId = roleMap['publicador'];
      if (publicadorId) {
        await client.execute({
          sql: 'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (?, ?)',
          args: [userId, publicadorId],
        });
        updatedMissing++;
      }
    }
  }

  console.log('----------------------------------------------------');
  console.log(`✅ Migración finalizada.`);
  console.log(`- Usuarios con roles mixtos corregidos: ${updatedMixed}`);
  console.log(`- Usuarios sin rol de predicación actualizados a "publicador": ${updatedMissing}`);

  // Verificación post-migración
  const checkPost = await client.execute(`
    SELECT u.id_usuario, u.nombre, u.apellido, GROUP_CONCAT(r.rol) as roles
    FROM usuario u
    LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    LEFT JOIN rol r ON ur.id_rol = r.id_rol
    GROUP BY u.id_usuario, u.nombre, u.apellido
  `);

  const stillMixed = checkPost.rows.filter(u => {
    const rList = (u.roles as string || '').split(',');
    return rList.filter(r => ['publicador', 'auxiliar', 'regular'].includes(r)).length > 1;
  });

  const stillMissing = checkPost.rows.filter(u => {
    const rList = (u.roles as string || '').split(',');
    return rList.filter(r => ['publicador', 'auxiliar', 'regular'].includes(r)).length === 0;
  });

  if (stillMixed.length > 0 || stillMissing.length > 0) {
    console.error('❌ Error de validación post-migración:', { stillMixed, stillMissing });
    process.exit(1);
  } else {
    console.log('🎯 Verificación exitosa: El 100% de los usuarios tiene exactamente 1 rol de predicación.');
  }
}

migrateUserRoles().catch((err) => {
  console.error('❌ Error fatal en migración:', err);
  process.exit(1);
});
