import { createClient } from '@libsql/client';

/**
 * Backfills usuario.genero for the dev DB so the assignment generator
 * (AssignablePerson.elegible() requires a defined genero) has candidates.
 *
 * - Inference dictionary for unambiguous Spanish first names.
 * - ID_OVERRIDES for genuinely ambiguous names, resolved with the user.
 * - Dry-run by default; --apply executes.
 * - Idempotent: only updates rows where genero IS NULL.
 */

const MASCULINOS = new Set([
  'jefferson', 'jeremy', 'gerardo', 'guillermo', 'valentin', 'fabio', 'alberto',
  'francisco', 'ricardo', 'luis', 'andrew', 'joel', 'liam', 'samuel', 'gonzalo',
  'hilarion', 'jesus', 'cesar', 'juan', 'ludwig', 'michael', 'henry', 'emanuel',
  'dante', 'pablo', 'rolando', 'isaac', 'augusto', 'angel', 'mauro', 'jose',
  'robert', 'sandro', 'oscar', 'carlos', 'esteban', 'roque', 'roberto',
  'sebastian', 'dario', 'lenin', 'mateo', 'andres', 'nelson', 'david', 'dostin',
  'edwin', 'denger', 'lucas', 'bryan', 'alex', 'daniel', 'jordan', 'ilmer',
  'diomar', 'fabricio', 'eusebio',
]);

const FEMENINOS = new Set([
  'lourdes', 'nelly', 'guisela', 'paula', 'jessica', 'jade', 'xiomara', 'carla',
  'maria', 'patricia', 'jesusa', 'dennisse', 'sofia', 'flor', 'zarela',
  'teresa', 'erika', 'sonia', 'juana', 'rossmery', 'rosmery', 'sara',
  'liliana', 'mary', 'silvia', 'rosa', 'gladys', 'leslie', 'lisset', 'damaris',
  'melissa', 'milena', 'isabel', 'shirley', 'luciana', 'giovanna', 'miluska',
  'jeszenia', 'jessenia', 'mia', 'mercedes', 'roxana', 'margarita', 'elizabeth',
  'rossana', 'victoria', 'rufina', 'vilma', 'ruth', 'karin', 'karen',
  'natalie', 'jheny', 'jhenny', 'gladis', 'mayra', 'alicia', 'rosario',
  'marisol', 'zenaida', 'miriam', 'narcisa', 'soledad', 'maribel', 'dayanna',
  'dayana', 'cintya', 'cinthia', 'valentina', 'monica', 'adanny', 'ysabella',
  'zivhelly', 'obertila', 'leticia', 'liset', 'elisabeth', 'maricruz', 'sarai',
]);

// Genuinely ambiguous names, resolved by the user (2026-09-18).
const ID_OVERRIDES: Record<number, 'masculino' | 'femenino'> = {
  138: 'masculino', // Alex Sanchez
  45: 'masculino', // Diomar Tamani
  82: 'masculino', // Denger Orbe
  153: 'femenino', // Adanny Gutierrez
  36: 'femenino', // Zivhelly Balarezo
  66: 'femenino', // Leslie Cornelio
};

function inferGenero(id: number, nombre: string): string | undefined {
  if (ID_OVERRIDES[id]) return ID_OVERRIDES[id];
  const first = nombre.trim().split(/\s+/)[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (MASCULINOS.has(first)) return 'masculino';
  if (FEMENINOS.has(first)) return 'femenino';
  return undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const db = createClient({ url: 'file:data/local.db' });

  const rows = (await db.execute('SELECT id_usuario, nombre, apellido, genero FROM usuario ORDER BY id_usuario')).rows;
  const updates: Array<{ id: number; genero: string; nombre: string }> = [];
  const unknown: string[] = [];

  for (const r of rows) {
    if (r.genero) continue; // already set — never clobber
    const nombre = String(r.nombre);
    const genero = inferGenero(Number(r.id_usuario), nombre);
    if (!genero) {
      unknown.push(`#${r.id_usuario} ${nombre} ${r.apellido}`);
      continue;
    }
    updates.push({ id: Number(r.id_usuario), genero, nombre: `${nombre} ${r.apellido}` });
  }

  for (const u of updates) console.log(`${apply ? '✏️ ' : '🔍'} #${u.id} ${u.nombre} → ${u.genero}`);

  console.log(`\n${apply ? '✅ APLICADO' : '🔍 DRY-RUN'}: ${updates.length} usuarios a actualizar, ${unknown.length} sin resolver.`);
  if (unknown.length > 0) {
    console.log('❌ Nombres sin género inferido (corregir el diccionario):');
    unknown.forEach((u) => console.log('   ' + u));
    process.exit(1);
  }
  if (apply) {
    for (const u of updates) {
      await db.execute({ sql: 'UPDATE usuario SET genero = ? WHERE id_usuario = ? AND genero IS NULL', args: [u.genero, u.id] });
    }
    const done = await db.execute('SELECT COUNT(*) AS n FROM usuario WHERE genero IS NOT NULL');
    console.log(`Usuarios con género: ${done.rows[0].n}`);
  } else {
    console.log('Corré con --apply para ejecutar.');
  }
  db.close();
}

main().catch((e) => { console.error('❌', e instanceof Error ? e.message : e); process.exit(1); });
