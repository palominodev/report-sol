import { join } from 'node:path';
import type { createClient } from '@libsql/client';
import type { AccountRole } from '@/core/domain/auth/Account';
import { CreateAccountUseCase } from '@/core/application/use-cases/auth/CreateAccountUseCase';
import { ResetPasswordUseCase } from '@/core/application/use-cases/auth/ResetPasswordUseCase';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { TursoAccountRepository } from '@/infrastructure/persistence/turso-account.repository';
import { TursoSessionRepository } from '@/infrastructure/persistence/turso-session.repository';
import { ScryptPasswordHasher } from '@/infrastructure/auth/scrypt-password-hasher';

type DatabaseClient = ReturnType<typeof createClient>;

export interface AccountCliDeps {
  /** Arguments after the script name (process.argv.slice(2)). */
  argv: string[];
  env: Record<string, string | undefined>;
  cwd: string;
  /** Reads `.env` (never `.env.local`); only called with --prod. */
  loadDotEnv: () => Record<string, string>;
  openClient: (url: string, authToken?: string) => DatabaseClient;
  /** Hidden (no echo) prompt. */
  readPassword: (prompt: string) => Promise<string>;
  /** Visible line prompt, used for the --prod confirmation. */
  readLine: (prompt: string) => Promise<string>;
  out: (line: string) => void;
  err: (line: string) => void;
}

const ROLES: readonly AccountRole[] = ['administrador', 'normal'];

export const USAGE = [
  'Uso:',
  '  pnpm account create <usuario> [--role administrador|normal] [--prod]',
  '  pnpm account reset-password <usuario> [--prod]',
  '',
  'Base de datos: por defecto SQLite local (data/local.db). Con --prod usa',
  'TURSO_URL (libsql://) y TURSO_TOKEN de .env y pide escribir "yes" antes de escribir.',
  'Rol por defecto en create: administrador si no hay cuentas, normal si ya existen.',
  '',
  'Contraseña: nunca como argumento. Se pide dos veces sin mostrarla; para uso',
  'no interactivo define la variable de entorno ACCOUNT_PASSWORD.',
  '',
  'Solo pruebas/humo: ACCOUNT_DB_FILE=<ruta> usa ese archivo SQLite en lugar de data/local.db.',
];

type Parsed =
  | { kind: 'help' }
  | { kind: 'usage-error'; message?: string }
  | { kind: 'create'; username: string; role: AccountRole | null; prod: boolean }
  | { kind: 'reset-password'; username: string; prod: boolean };

function parseArgs(argv: string[]): Parsed {
  const positionals: string[] = [];
  let prod = false;
  let roleValue: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { kind: 'help' };
    if (arg === '--prod') prod = true;
    else if (arg === '--role') {
      const value = argv[++i];
      if (value === undefined) return { kind: 'usage-error', message: 'Falta el valor de --role (administrador|normal).' };
      roleValue = value;
    } else if (arg.startsWith('--role=')) roleValue = arg.slice('--role='.length);
    else if (arg.startsWith('-')) return { kind: 'usage-error', message: `Opción desconocida: ${arg}` };
    else positionals.push(arg);
  }

  const [command, username, ...extra] = positionals;
  if (command !== 'create' && command !== 'reset-password') return { kind: 'usage-error' };
  if (!username || extra.length > 0) return { kind: 'usage-error' };

  if (command === 'reset-password') {
    if (roleValue !== null) return { kind: 'usage-error', message: '--role solo aplica a create.' };
    return { kind: 'reset-password', username, prod };
  }

  if (roleValue !== null && !ROLES.includes(roleValue as AccountRole)) {
    return { kind: 'usage-error', message: '--role debe ser administrador|normal.' };
  }
  return { kind: 'create', username, role: roleValue as AccountRole | null, prod };
}

class CliError extends Error {}

/** Runs the account command and returns the process exit code. */
export async function runAccountCli(deps: AccountCliDeps): Promise<number> {
  const parsed = parseArgs(deps.argv);

  if (parsed.kind === 'help') {
    USAGE.forEach((line) => deps.out(line));
    return 0;
  }
  if (parsed.kind === 'usage-error') {
    if (parsed.message) deps.err(`Error: ${parsed.message}`);
    USAGE.forEach((line) => deps.err(line));
    return 2;
  }

  try {
    // 1. Deliberate target: local by default, remote only with --prod.
    let url: string;
    let token: string | undefined;
    if (parsed.prod) {
      const dotEnv = deps.loadDotEnv();
      url = dotEnv.TURSO_URL ?? '';
      token = dotEnv.TURSO_TOKEN;
      if (!url.startsWith('libsql://') || !token) {
        throw new CliError('--prod requiere TURSO_URL (libsql://) y TURSO_TOKEN en .env');
      }
      deps.out(`PRODUCCIÓN: ${url}`);
      const answer = (await deps.readLine('Escribe "yes" para continuar: ')).trim();
      if (answer !== 'yes') throw new CliError('Operación cancelada.');
    } else {
      url = `file:${deps.env.ACCOUNT_DB_FILE || join(deps.cwd, 'data', 'local.db')}`;
    }

    // 2. Password: env var for non-interactive use, otherwise hidden prompt twice.
    const password = await obtainPassword(deps);

    // 3. Wire the existing use cases onto the chosen database.
    setDatabaseClient(deps.openClient(url, token));
    const accounts = new TursoAccountRepository();
    const hasher = new ScryptPasswordHasher();

    if (parsed.kind === 'create') {
      const rol: AccountRole =
        parsed.role ?? ((await accounts.findAll()).length === 0 ? 'administrador' : 'normal');
      const account = await new CreateAccountUseCase(accounts, hasher).execute({
        username: parsed.username,
        password,
        rol,
      });
      deps.out(`Cuenta "${account.username}" creada con tipo ${account.rol}.`);
    } else {
      await new ResetPasswordUseCase(accounts, new TursoSessionRepository(), hasher).execute({
        username: parsed.username,
        newPassword: password,
      });
      deps.out(`Contraseña de "${parsed.username.trim()}" actualizada.`);
      deps.out('Se cerraron todas las sesiones abiertas de esa cuenta.');
    }
    return 0;
  } catch (error) {
    deps.err(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    setDatabaseClient(null);
  }
}

async function obtainPassword(deps: AccountCliDeps): Promise<string> {
  const fromEnv = deps.env.ACCOUNT_PASSWORD;
  if (fromEnv) return fromEnv;
  const first = await deps.readPassword('Contraseña: ');
  const second = await deps.readPassword('Repite la contraseña: ');
  if (first !== second) throw new CliError('Las contraseñas no coinciden.');
  return first;
}
