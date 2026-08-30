import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Seeds historical meeting data for July 2026 (4 weeks) into the LOCAL database.
 *
 * Behavior:
 * - LOCAL ONLY: refuses to run when the configured database is not a file: URL.
 * - Self-contained: ensures the presentation tables exist (re-runs src/db.sql
 *   tolerating already-exists errors, like scripts/db-push.ts) and that the
 *   `genero` column exists on `usuario` (idempotent PRAGMA check + ALTER TABLE,
 *   like scripts/migrate-genero.ts).
 * - Idempotent: if any presentation_week with one of the target fecha_inicio
 *   values already exists, the whole run is skipped. Users are insert-or-find
 *   by accent/case-insensitive full name, so existing users with different
 *   spellings are reused instead of duplicated; NULL genero gets backfilled.
 * - All writes happen inside a single transaction.
 *
 * Run: pnpm tsx scripts/seed-july-assignments.ts
 */

type DatabaseClient = ReturnType<typeof createClient>;
type Genero = 'masculino' | 'femenino';
type TipoParte =
  | 'lectura_biblia'
  | 'empiece_conversaciones'
  | 'haga_revisitas'
  | 'haga_discipulos'
  | 'discurso'
  | 'escenificacion';

interface UsuarioSeed {
  nombre: string;
  apellido: string;
  genero: Genero;
}

interface PersonaRef {
  nombre: string;
  apellido: string;
}

interface ParteSeed {
  tipo: TipoParte;
  fuente: string;
  /** First entry is the presentador; second (if any) is the companero. */
  personas: PersonaRef[];
}

interface SemanaSeed {
  fechaInicio: string;
  fechaFin: string;
  partes: ParteSeed[];
}

// ---------------------------------------------------------------------------
// Historical data (July 2026)
// ---------------------------------------------------------------------------

const USUARIOS: UsuarioSeed[] = [
  // Masculino
  { nombre: 'Sandro', apellido: 'Valeriano', genero: 'masculino' },
  { nombre: 'Alberto', apellido: 'Fernández', genero: 'masculino' },
  { nombre: 'Mauro', apellido: 'Cancho', genero: 'masculino' },
  { nombre: 'Edwin', apellido: 'Buiza', genero: 'masculino' },
  { nombre: 'Sebastian', apellido: 'Avilés', genero: 'masculino' },
  { nombre: 'Pablo', apellido: 'Contreras', genero: 'masculino' },
  { nombre: 'Juan', apellido: 'Sirlupú', genero: 'masculino' },
  { nombre: 'Andrew', apellido: 'Fernández', genero: 'masculino' },
  { nombre: 'Eusebio', apellido: 'Medina', genero: 'masculino' },
  { nombre: 'Lenin', apellido: 'Nieva', genero: 'masculino' },
  { nombre: 'Daniel', apellido: 'Grimaldo', genero: 'masculino' },
  { nombre: 'Samuel', apellido: 'Carrasco', genero: 'masculino' },
  { nombre: 'Rolando', apellido: 'Montenegro', genero: 'masculino' },
  { nombre: 'Diomar', apellido: 'Tamani', genero: 'masculino' },
  { nombre: 'Roque', apellido: 'Garay', genero: 'masculino' },
  { nombre: 'David', apellido: 'Gutierrez', genero: 'masculino' },
  { nombre: 'Lucas', apellido: 'Ramírez', genero: 'masculino' },
  { nombre: 'Ludwig', apellido: 'Fernández', genero: 'masculino' },
  { nombre: 'Emanuel', apellido: 'Racchumi', genero: 'masculino' },
  { nombre: 'Luis', apellido: 'Fernandez', genero: 'masculino' },
  { nombre: 'Augusto', apellido: 'Correa', genero: 'masculino' },
  { nombre: 'Bryan', apellido: 'Avilés', genero: 'masculino' },
  { nombre: 'Dante', apellido: 'Racchumi', genero: 'masculino' },
  { nombre: 'Liam', apellido: 'Racchumi', genero: 'masculino' },
  { nombre: 'Samuel', apellido: 'Racchumi', genero: 'masculino' },
  { nombre: 'Fabricio', apellido: 'Contreras', genero: 'masculino' },
  { nombre: 'Francisco', apellido: 'Rivadeneira', genero: 'masculino' },
  // Femenino
  { nombre: 'Sonia', apellido: 'Fernández', genero: 'femenino' },
  { nombre: 'Jhenny', apellido: 'Fernández', genero: 'femenino' },
  { nombre: 'Dayana', apellido: 'Nieva', genero: 'femenino' },
  { nombre: 'Paula', apellido: 'Herrera', genero: 'femenino' },
  { nombre: 'Maribel', apellido: 'Nieva', genero: 'femenino' },
  { nombre: 'Ysabella', apellido: 'Gutierrez', genero: 'femenino' },
  { nombre: 'Milena', apellido: 'Racchumi', genero: 'femenino' },
  { nombre: 'Rosa', apellido: 'Nieva', genero: 'femenino' },
  { nombre: 'Isabel', apellido: 'Hernandez', genero: 'femenino' },
  { nombre: 'Carla', apellido: 'Castillo', genero: 'femenino' },
  { nombre: 'Karen', apellido: 'Valeriano', genero: 'femenino' },
  { nombre: 'Erica', apellido: 'Castillo', genero: 'femenino' },
];

const SEMANAS: SemanaSeed[] = [
  {
    fechaInicio: '2026-07-06',
    fechaFin: '2026-07-12',
    partes: [
      { tipo: 'lectura_biblia', fuente: 'Lectura de la Biblia', personas: [{ nombre: 'Edwin', apellido: 'Buiza' }] },
      {
        tipo: 'empiece_conversaciones',
        fuente: 'Empiece conversaciones',
        personas: [
          { nombre: 'Sonia', apellido: 'Fernández' },
          { nombre: 'Jhenny', apellido: 'Fernández' },
        ],
      },
      {
        tipo: 'haga_revisitas',
        fuente: 'Haga revisitas',
        personas: [
          { nombre: 'Dayana', apellido: 'Nieva' },
          { nombre: 'Paula', apellido: 'Herrera' },
        ],
      },
      { tipo: 'discurso', fuente: 'Discurso', personas: [{ nombre: 'Sebastian', apellido: 'Avilés' }] },
    ],
  },
  {
    fechaInicio: '2026-07-13',
    fechaFin: '2026-07-19',
    partes: [
      { tipo: 'lectura_biblia', fuente: 'Lectura de la Biblia', personas: [{ nombre: 'Daniel', apellido: 'Grimaldo' }] },
      {
        tipo: 'empiece_conversaciones',
        fuente: 'Empiece conversaciones',
        personas: [
          { nombre: 'Maribel', apellido: 'Nieva' },
          { nombre: 'Ysabella', apellido: 'Gutierrez' },
        ],
      },
      {
        tipo: 'haga_revisitas',
        fuente: 'Haga revisitas',
        personas: [
          { nombre: 'Milena', apellido: 'Racchumi' },
          { nombre: 'Paula', apellido: 'Herrera' },
        ],
      },
      {
        tipo: 'haga_discipulos',
        fuente: 'Haga discípulos',
        personas: [
          { nombre: 'Rosa', apellido: 'Nieva' },
          { nombre: 'Jhenny', apellido: 'Fernández' },
        ],
      },
    ],
  },
  {
    fechaInicio: '2026-07-20',
    fechaFin: '2026-07-26',
    partes: [
      { tipo: 'lectura_biblia', fuente: 'Lectura de la Biblia', personas: [{ nombre: 'Roque', apellido: 'Garay' }] },
      {
        tipo: 'empiece_conversaciones',
        fuente: 'Empiece conversaciones',
        personas: [
          { nombre: 'David', apellido: 'Gutierrez' },
          { nombre: 'Lucas', apellido: 'Ramírez' },
        ],
      },
      {
        tipo: 'haga_revisitas',
        fuente: 'Haga revisitas',
        personas: [
          { nombre: 'Andrew', apellido: 'Fernández' },
          { nombre: 'Ludwig', apellido: 'Fernández' },
        ],
      },
      { tipo: 'discurso', fuente: 'Explique sus creencias', personas: [{ nombre: 'Emanuel', apellido: 'Racchumi' }] },
      { tipo: 'discurso', fuente: 'Pasos para recuperarnos', personas: [{ nombre: 'Luis', apellido: 'Fernandez' }] },
    ],
  },
  {
    fechaInicio: '2026-07-27',
    fechaFin: '2026-08-02',
    partes: [
      { tipo: 'lectura_biblia', fuente: 'Lectura de la Biblia', personas: [{ nombre: 'Mauro', apellido: 'Cancho' }] },
      {
        tipo: 'empiece_conversaciones',
        fuente: 'Empiece conversaciones',
        personas: [
          { nombre: 'Isabel', apellido: 'Hernandez' },
          { nombre: 'Carla', apellido: 'Castillo' },
        ],
      },
      {
        tipo: 'haga_revisitas',
        fuente: 'Haga revisitas',
        personas: [
          { nombre: 'Karen', apellido: 'Valeriano' },
          { nombre: 'Erica', apellido: 'Castillo' },
        ],
      },
      {
        tipo: 'escenificacion',
        fuente: 'Explique sus creencias (Escenificación)',
        personas: [
          { nombre: 'Liam', apellido: 'Racchumi' },
          { nombre: 'Samuel', apellido: 'Racchumi' },
        ],
      },
      { tipo: 'discurso', fuente: 'Seamos adaptables', personas: [{ nombre: 'Bryan', apellido: 'Avilés' }] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Env / connection helpers (mirrors scripts/seed.ts and scripts/db-push.ts)
// ---------------------------------------------------------------------------

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

function resolveLocalDbPath(envVars: Record<string, string>): string {
  const url = envVars.TURSO_URL?.trim();
  if (url && url.startsWith('file:')) {
    return resolve(process.cwd(), url.slice('file:'.length));
  }
  return join(process.cwd(), 'data', 'local.db');
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return parseInt(value, 10);
  return 0;
}

function personaKey(p: PersonaRef): string {
  return `${p.nombre}|${p.apellido}`;
}

/**
 * Normalizes a full name for duplicate-insensitive matching:
 * NFD normalize, strip combining marks (accents), lowercase.
 * "Fernández" and "Fernandez" normalize to the same key.
 */
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizedPersonaKey(nombre: string, apellido: string): string {
  return normalizeName(`${nombre} ${apellido}`);
}

/**
 * Known spelling variants that accent/case normalization alone cannot
 * reconcile (different base letters), mapped spec-name -> existing DB name.
 * Name-based (not id-based) so it stays valid on any restored/backup DB.
 * Without this, a fresh run would still duplicate these five people.
 */
const KNOWN_NAME_ALIASES: Record<string, string> = {
  [normalizedPersonaKey('Juan', 'Sirlupú')]: normalizedPersonaKey('Juan', 'Sirlopu'),
  [normalizedPersonaKey('Jhenny', 'Fernández')]: normalizedPersonaKey('Jheny', 'Fernandez'),
  [normalizedPersonaKey('Dayana', 'Nieva')]: normalizedPersonaKey('Dayanna', 'Nieva'),
  [normalizedPersonaKey('Karen', 'Valeriano')]: normalizedPersonaKey('Karin', 'Valeriano'),
  [normalizedPersonaKey('Erica', 'Castillo')]: normalizedPersonaKey('Erika', 'Castillo'),
};

/**
 * Resolves the lookup key for a name: applies known base-letter aliases
 * first, then falls back to the accent/case-normalized full name.
 */
function resolveLookupKey(nombre: string, apellido: string): string {
  const specKey = normalizedPersonaKey(nombre, apellido);
  return KNOWN_NAME_ALIASES[specKey] ?? specKey;
}

// ---------------------------------------------------------------------------
// Schema bootstrap (self-contained and idempotent)
// ---------------------------------------------------------------------------

const PRESENTATION_TABLES = ['presentation_week', 'presentation_part', 'presentation_assignment'];

async function tableExists(client: DatabaseClient, table: string): Promise<boolean> {
  const result = await client.execute({
    sql: 'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
    args: ['table', table],
  });
  return result.rows.length > 0;
}

async function executeSqlFile(client: DatabaseClient, filePath: string): Promise<void> {
  const sql = readFileSync(filePath, 'utf-8');
  const lines = sql.split('\n').filter((line) => !line.trim().startsWith('--'));
  const cleanSql = lines.join('\n');
  const statements = cleanSql.split(';').map((s) => s.trim()).filter((s) => s.length > 0);

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

async function ensureSchema(client: DatabaseClient): Promise<void> {
  const missing: string[] = [];
  for (const table of PRESENTATION_TABLES) {
    if (!(await tableExists(client, table))) missing.push(table);
  }

  if (missing.length > 0) {
    console.log(`📄 Faltan tablas (${missing.join(', ')}). Ejecutando src/db.sql...`);
    await executeSqlFile(client, join(process.cwd(), 'src', 'db.sql'));
  } else {
    console.log('📄 Tablas de presentation ya existen.');
  }

  const info = await client.execute('PRAGMA table_info(usuario)');
  const hasGenero = info.rows.some((row) => (row as unknown as { name: string }).name === 'genero');
  if (!hasGenero) {
    await client.execute(`
      ALTER TABLE usuario
      ADD COLUMN genero TEXT CHECK(genero IN ('masculino','femenino'))
    `);
    console.log('✅ Columna "genero" agregada a usuario.');
  } else {
    console.log('📄 Columna "genero" ya existe en usuario.');
  }
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

interface ExistingUsuario {
  idUsuario: number;
  genero: string | null;
}

/**
 * Loads every usuario row once and indexes it by normalized full name
 * (accent- and case-insensitive) so existing users with different
 * spellings are found instead of duplicated.
 */
async function loadExistingUsuarios(client: DatabaseClient): Promise<Map<string, ExistingUsuario>> {
  const result = await client.execute('SELECT id_usuario, nombre, apellido, genero FROM usuario');
  const byNormalizedName = new Map<string, ExistingUsuario>();

  for (const row of result.rows) {
    const key = normalizedPersonaKey(String(row.nombre ?? ''), String(row.apellido ?? ''));
    // On collisions keep the first (lowest-scanned) row; names are unique enough here.
    if (!byNormalizedName.has(key)) {
      byNormalizedName.set(key, {
        idUsuario: toNumber(row.id_usuario),
        genero: (row.genero as string | null) ?? null,
      });
    }
  }

  return byNormalizedName;
}

async function seedUsers(client: DatabaseClient): Promise<{ ids: Map<string, number>; inserted: number; found: number; generoUpdated: number }> {
  const ids = new Map<string, number>();
  let inserted = 0;
  let found = 0;
  let generoUpdated = 0;

  const existingUsuarios = await loadExistingUsuarios(client);

  for (const usuario of USUARIOS) {
    const existing = existingUsuarios.get(resolveLookupKey(usuario.nombre, usuario.apellido));

    if (!existing) {
      // Brand-new user: insert with the spec spelling.
      const result = await client.execute({
        sql: 'INSERT INTO usuario (nombre, apellido, genero) VALUES (?, ?, ?)',
        args: [usuario.nombre, usuario.apellido, usuario.genero],
      });
      ids.set(personaKey(usuario), toNumber(result.lastInsertRowid));
      inserted++;
      continue;
    }

    if (existing.genero === null || existing.genero === undefined) {
      await client.execute({
        sql: 'UPDATE usuario SET genero = ? WHERE id_usuario = ?',
        args: [usuario.genero, existing.idUsuario],
      });
      existing.genero = usuario.genero;
      generoUpdated++;
    }
    ids.set(personaKey(usuario), existing.idUsuario);
    found++;
  }

  return { ids, inserted, found, generoUpdated };
}

async function seedWeeks(client: DatabaseClient, userIds: Map<string, number>): Promise<{ weeks: number; parts: number; assignments: number }> {
  let partCount = 0;
  let assignmentCount = 0;

  for (const semana of SEMANAS) {
    const weekResult = await client.execute({
      sql: 'INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, ?)',
      args: [semana.fechaInicio, `mwb-${semana.fechaInicio}`, semana.fechaInicio, semana.fechaFin, 'confirmada'],
    });
    const idWeek = toNumber(weekResult.lastInsertRowid);

    for (let index = 0; index < semana.partes.length; index++) {
      const parte = semana.partes[index];
      const orden = index + 1;
      const seccion = parte.tipo === 'lectura_biblia' ? 'TESOROS_DE_LA_BIBLIA' : 'SEAMOS_MEJORES_MAESTROS';
      const duracionMin = parte.tipo === 'lectura_biblia' ? 4 : 5;

      const partResult = await client.execute({
        sql: `INSERT INTO presentation_part
              (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto)
              VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL)`,
        args: [idWeek, orden, parte.tipo, seccion, duracionMin, parte.fuente],
      });
      const idPart = toNumber(partResult.lastInsertRowid);
      partCount++;

      for (let personIndex = 0; personIndex < parte.personas.length; personIndex++) {
        const persona = parte.personas[personIndex];
        const rol = personIndex === 0 ? 'presentador' : 'companero';
        const idUsuario = userIds.get(personaKey(persona));
        if (idUsuario === undefined) {
          throw new Error(`Usuario referenciado no encontrado en la lista de seed: ${persona.nombre} ${persona.apellido}`);
        }

        await client.execute({
          sql: `INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado)
                VALUES (?, ?, ?, ?, ?)`,
          args: [idPart, idWeek, idUsuario, rol, 'confirmed'],
        });
        assignmentCount++;
      }
    }
  }

  return { weeks: SEMANAS.length, parts: partCount, assignments: assignmentCount };
}

// ---------------------------------------------------------------------------
// Verification (read-only)
// ---------------------------------------------------------------------------

interface AsignacionVerificada {
  orden: number;
  tipo: string;
  fuente: string;
  rol: string;
  nombre: string;
  apellido: string;
}

async function verify(client: DatabaseClient, userIds: Map<string, number>): Promise<number> {
  let failures = 0;
  const check = (label: string, ok: boolean, detail?: string) => {
    console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures++;
  };

  console.log('\n🔎 Verificación (solo lectura)...');

  const fechas = SEMANAS.map((s) => s.fechaInicio);
  const weekCount = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM presentation_week WHERE fecha_inicio IN (?, ?, ?, ?)',
    args: fechas,
  });
  check('Semanas de julio 2026', toNumber(weekCount.rows[0].count) === 4, `esperado 4, obtenido ${weekCount.rows[0].count}`);

  const expectedAssignments = [6, 7, 7, 8];
  const expectedParts = [4, 4, 5, 5];

  for (let weekIndex = 0; weekIndex < SEMANAS.length; weekIndex++) {
    const semana = SEMANAS[weekIndex];
    const weekRow = await client.execute({
      sql: 'SELECT id_week FROM presentation_week WHERE fecha_inicio = ?',
      args: [semana.fechaInicio],
    });
    if (weekRow.rows.length === 0) {
      check(`Semana ${semana.fechaInicio}`, false, 'no encontrada');
      continue;
    }
    const idWeek = toNumber(weekRow.rows[0].id_week);

    const partCount = toNumber(
      (await client.execute({ sql: 'SELECT COUNT(*) as count FROM presentation_part WHERE id_week = ?', args: [idWeek] })).rows[0].count,
    );
    check(
      `Semana ${semana.fechaInicio}: partes`,
      partCount === expectedParts[weekIndex],
      `esperado ${expectedParts[weekIndex]}, obtenido ${partCount}`,
    );

    const assignmentCount = toNumber(
      (await client.execute({ sql: 'SELECT COUNT(*) as count FROM presentation_assignment WHERE id_week = ?', args: [idWeek] })).rows[0]
        .count,
    );
    check(
      `Semana ${semana.fechaInicio}: asignaciones`,
      assignmentCount === expectedAssignments[weekIndex],
      `esperado ${expectedAssignments[weekIndex]}, obtenido ${assignmentCount}`,
    );

    // Verify per-part person/rol mapping against the expected data.
    const rows = await client.execute({
      sql: `SELECT pp.orden, pp.tipo, pp.fuente, pa.rol, u.nombre, u.apellido
            FROM presentation_part pp
            JOIN presentation_assignment pa ON pa.id_part = pp.id_part
            JOIN usuario u ON u.id_usuario = pa.id_usuario
            WHERE pp.id_week = ?
            ORDER BY pp.orden, CASE pa.rol WHEN 'presentador' THEN 0 ELSE 1 END`,
      args: [idWeek],
    });
    const actual: AsignacionVerificada[] = rows.rows.map((r) => ({
      orden: toNumber(r.orden),
      tipo: r.tipo as string,
      fuente: r.fuente as string,
      rol: r.rol as string,
      nombre: r.nombre as string,
      apellido: r.apellido as string,
    }));

    const expected: AsignacionVerificada[] = [];
    semana.partes.forEach((parte, index) => {
      parte.personas.forEach((persona, personIndex) => {
        expected.push({
          orden: index + 1,
          tipo: parte.tipo,
          fuente: parte.fuente,
          rol: personIndex === 0 ? 'presentador' : 'companero',
          nombre: persona.nombre,
          apellido: persona.apellido,
        });
      });
    });

    const mappingOk =
      actual.length === expected.length &&
      expected.every((e, i) => {
        const a = actual[i];
        // Names are compared through resolveLookupKey (accent/case-insensitive
        // plus known aliases): assignments may point to pre-existing users
        // whose DB spelling differs from the spec.
        return (
          a &&
          a.orden === e.orden &&
          a.tipo === e.tipo &&
          a.fuente === e.fuente &&
          a.rol === e.rol &&
          resolveLookupKey(a.nombre, a.apellido) === resolveLookupKey(e.nombre, e.apellido)
        );
      });
    check(`Semana ${semana.fechaInicio}: mapeo de partes/roles`, mappingOk, mappingOk ? 'coincide con el cronograma' : 'difiere del cronograma esperado');
  }

  const seededIds = Array.from(userIds.values());
  const placeholders = seededIds.map(() => '?').join(', ');
  const nullGenero = await client.execute({
    sql: `SELECT COUNT(*) as count FROM usuario WHERE genero IS NULL AND id_usuario IN (${placeholders})`,
    args: seededIds,
  });
  check('Usuarios seedeados con genero', toNumber(nullGenero.rows[0].count) === 0, `${nullGenero.rows[0].count} con genero NULL`);

  return failures;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL?.trim();

  // Hard guard: never run against a remote (Turso) database.
  if (url && !url.startsWith('file:')) {
    console.error('❌ ERROR: Este script solo puede ejecutarse contra la base de datos local (file:).');
    console.error(`   TURSO_URL actual: ${url}`);
    process.exit(1);
  }
  if (envVars.TURSO_TOKEN?.trim()) {
    console.error('❌ ERROR: TURSO_TOKEN presente. Quitá las credenciales de Turso de .env.local para seedear datos locales.');
    process.exit(1);
  }

  const dbPath = resolveLocalDbPath(envVars);
  const client = createClient({ url: `file:${dbPath}` });
  console.log(`💻 Seed de asignaciones históricas — Julio 2026\n📁 Base de datos: ${dbPath}\n`);

  await client.execute('PRAGMA foreign_keys = ON');
  await ensureSchema(client);

  // Idempotency guard: skip the whole run if any target week already exists.
  const fechas = SEMANAS.map((s) => s.fechaInicio);
  const existingWeeks = await client.execute({
    sql: 'SELECT fecha_inicio FROM presentation_week WHERE fecha_inicio IN (?, ?, ?, ?)',
    args: fechas,
  });
  if (existingWeeks.rows.length > 0) {
    const existentes = existingWeeks.rows.map((r) => r.fecha_inicio).join(', ');
    console.log(`\n⏭️  Ya existen semanas con fecha_inicio en (${existentes}). No se realizan cambios.`);
    console.log('✅ Seed omitido (idempotente).');
    return;
  }

  await client.execute('BEGIN');
  let userIds: Map<string, number>;
  try {
    const userResult = await seedUsers(client);
    userIds = userResult.ids;
    console.log(
      `👥 Usuarios: ${userResult.inserted} creados, ${userResult.found} ya existentes, ${userResult.generoUpdated} con genero actualizado.`,
    );

    const seedResult = await seedWeeks(client, userIds);
    console.log(
      `📅 Semanas: ${seedResult.weeks} | Partes: ${seedResult.parts} | Asignaciones: ${seedResult.assignments}`,
    );

    await client.execute('COMMIT');
  } catch (error) {
    try {
      await client.execute('ROLLBACK');
    } catch {
      // Transaction may not have started; ignore rollback failure.
    }
    throw error;
  }

  console.log('✅ Datos de julio 2026 insertados correctamente.');

  const failures = await verify(client, userIds);
  if (failures > 0) {
    console.error(`\n❌ Verificación falló en ${failures} chequeo(s).`);
    process.exit(1);
  }
  console.log('\n🎉 Seed y verificación completados sin errores.');
}

main().catch((error: unknown) => {
  console.error('❌ Error durante el seed:', error);
  process.exit(1);
});
