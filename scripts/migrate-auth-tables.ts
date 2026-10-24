import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

/**
 * Adds ONLY the authentication tables (cuenta, sesion and the session index) to a database.
 *
 * Why not `pnpm db:push --prod`: that command runs the whole src/db.sql, which also carries the
 * sala expression index that scripts/migrate-sala-unique-index.ts manages on its own. This script
 * touches nothing else: purely additive, IF NOT EXISTS, and it refuses a pre-existing `cuenta` or
 * `sesion` table whose columns differ from the schema. The statements are taken from src/db.sql so
 * the schema is written in one place only.
 *
 * Targets (exactly one required, NEVER inferred):
 *   --db <path>   a SQLite file (relative to the current directory)
 *   --prod        remote Turso, TURSO_URL/TURSO_TOKEN from .env; shows the destination, asks for "yes"
 * Options:
 *   --check       only report which auth objects exist; writes nothing, asks nothing
 *
 * Undo (both tables are empty until the first account is created): DROP TABLE sesion; DROP TABLE cuenta;
 */

type DatabaseClient = ReturnType<typeof createClient>;

export const AUTH_OBJECTS = ['cuenta', 'sesion', 'idx_sesion_cuenta'] as const;
type AuthObject = (typeof AUTH_OBJECTS)[number];

const EXPECTED_COLUMNS: Record<'cuenta' | 'sesion', string[]> = {
  cuenta: ['id_cuenta', 'username', 'password_hash', 'rol', 'activa', 'creada_en'],
  sesion: ['token_hash', 'id_cuenta', 'expira_en', 'creada_en'],
};

/** The CREATE statements of the auth objects, copied verbatim from the schema file. */
export function authStatementsFromSchema(schemaSql: string): string[] {
  const withoutComments = schemaSql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const statements = withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return AUTH_OBJECTS.map((name) => {
    const found = statements.find((s) =>
      new RegExp(`^CREATE\\s+(UNIQUE\\s+)?(TABLE|INDEX)\\s+IF\\s+NOT\\s+EXISTS\\s+${name}\\b`, 'i').test(s)
    );
    if (!found) throw new Error(`src/db.sql no define "${name}" con CREATE ... IF NOT EXISTS.`);
    return found;
  });
}

async function existingNames(client: DatabaseClient): Promise<Set<string>> {
  const result = await client.execute(
    `SELECT name FROM sqlite_master WHERE name IN (${AUTH_OBJECTS.map(() => '?').join(',')})`,
    [...AUTH_OBJECTS]
  );
  return new Set(result.rows.map((row) => String(row.name)));
}

export async function inspectAuthTables(client: DatabaseClient): Promise<{ present: AuthObject[]; missing: AuthObject[] }> {
  const names = await existingNames(client);
  return {
    present: AUTH_OBJECTS.filter((n) => names.has(n)),
    missing: AUTH_OBJECTS.filter((n) => !names.has(n)),
  };
}

async function assertExpectedShape(client: DatabaseClient, table: 'cuenta' | 'sesion'): Promise<void> {
  const columns = (await client.execute(`PRAGMA table_info(${table})`)).rows.map((row) => String(row.name));
  const expected = EXPECTED_COLUMNS[table];
  if (columns.join(',') !== expected.join(',')) {
    throw new Error(
      `La tabla "${table}" ya existe con otras columnas (${columns.join(', ')}); esperaba (${expected.join(', ')}). ` +
        'No se escribió nada.'
    );
  }
}

/** Creates the missing auth objects. Idempotent; writes nothing if an existing table has another shape. */
export async function ensureAuthTables(client: DatabaseClient): Promise<{ created: AuthObject[]; alreadyPresent: AuthObject[] }> {
  const statements = authStatementsFromSchema(readFileSync(join(process.cwd(), 'src', 'db.sql'), 'utf8'));
  const { present, missing } = await inspectAuthTables(client);

  // Validate everything that exists BEFORE writing anything.
  for (const table of ['cuenta', 'sesion'] as const) {
    if (present.includes(table)) await assertExpectedShape(client, table);
  }

  if (missing.length > 0) {
    // One batch = one transaction: either every missing object is created or none.
    await client.batch(
      statements.filter((_, index) => missing.includes(AUTH_OBJECTS[index])),
      'write'
    );
  }
  return { created: missing, alreadyPresent: present };
}

export interface AuthMigrationCliDeps {
  /** Arguments after the script name. */
  argv: string[];
  env: Record<string, string | undefined>;
  cwd: string;
  /** Reads `.env` (never `.env.local`); only called with --prod. */
  loadDotEnv: () => Record<string, string>;
  openClient: (url: string, authToken?: string) => DatabaseClient;
  readLine: (prompt: string) => Promise<string>;
  out: (line: string) => void;
  err: (line: string) => void;
}

const USAGE = [
  'Uso:',
  '  tsx scripts/migrate-auth-tables.ts --db <archivo.db> [--check]',
  '  tsx scripts/migrate-auth-tables.ts --prod [--check]',
  '',
  'Crea solo cuenta, sesion e idx_sesion_cuenta. No toca ninguna otra tabla.',
  'El destino es obligatorio y nunca se infiere. Con --prod usa TURSO_URL y TURSO_TOKEN de .env',
  'y pide escribir "yes". Con --check solo informa lo que existe.',
];

class CliError extends Error {}

/** Runs the command and returns the process exit code. */
export async function runAuthMigrationCli(deps: AuthMigrationCliDeps): Promise<number> {
  let prod = false;
  let check = false;
  let dbPath: string | null = null;
  for (let i = 0; i < deps.argv.length; i++) {
    const arg = deps.argv[i];
    if (arg === '--prod') prod = true;
    else if (arg === '--check') check = true;
    else if (arg === '--db') dbPath = deps.argv[++i] ?? null;
    else {
      deps.err(`Opción desconocida: ${arg}`);
      USAGE.forEach((line) => deps.err(line));
      return 2;
    }
  }
  if (prod === (dbPath !== null) ) {
    deps.err('Falta el destino: indica exactamente uno de --prod o --db <archivo>.');
    USAGE.forEach((line) => deps.err(line));
    return 2;
  }

  let client: DatabaseClient | null = null;
  try {
    let url: string;
    let token: string | undefined;
    if (prod) {
      const dotEnv = deps.loadDotEnv();
      url = dotEnv.TURSO_URL ?? '';
      token = dotEnv.TURSO_TOKEN;
      if (!url.startsWith('libsql://') || !token) {
        throw new CliError('--prod requiere TURSO_URL (libsql://) y TURSO_TOKEN en .env');
      }
      deps.out(`PRODUCCIÓN: ${url}`);
      if (!check) {
        const answer = (await deps.readLine('Se crearán las tablas de cuentas (cuenta, sesion). Escribe "yes" para continuar: ')).trim();
        if (answer !== 'yes') throw new CliError('Operación cancelada.');
      }
    } else {
      const path = isAbsolute(dbPath as string) ? (dbPath as string) : join(deps.cwd, dbPath as string);
      url = `file:${path}`;
    }

    client = deps.openClient(url, token);

    if (check) {
      const { present, missing } = await inspectAuthTables(client);
      deps.out(`Existen: ${present.length ? present.join(', ') : '(ninguno)'}`);
      deps.out(missing.length ? `Faltan: ${missing.join(', ')}` : 'No falta nada.');
      return 0;
    }

    const { created, alreadyPresent } = await ensureAuthTables(client);
    if (alreadyPresent.length) deps.out(`Ya existían: ${alreadyPresent.join(', ')}`);
    deps.out(created.length ? `Creados: ${created.join(', ')}` : 'No había nada que crear.');
    return 0;
  } catch (error) {
    deps.err(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    client?.close();
  }
}

function loadDotEnv(): Record<string, string> {
  const envPath = join(process.cwd(), '.env');
  const vars: Record<string, string> = {};
  if (!existsSync(envPath)) return vars;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) vars[key] = rest.join('=').replace(/['"]/g, '');
  }
  return vars;
}

function readLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Direct-run guard so tests can import the functions without running the command.
const isDirectRun = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runAuthMigrationCli({
    argv: process.argv.slice(2),
    env: process.env,
    cwd: process.cwd(),
    loadDotEnv,
    openClient: (url, authToken) => createClient({ url, authToken }),
    readLine,
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  }).then((code) => process.exit(code));
}
