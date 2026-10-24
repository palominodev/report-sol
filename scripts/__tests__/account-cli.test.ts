import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { runAccountCli, type AccountCliDeps } from '../lib/account-cli';

type DatabaseClient = ReturnType<typeof createClient>;

const PASSWORD = 'clave-segura-123';

let client: DatabaseClient;

interface RunOptions {
  env?: Record<string, string>;
  dotEnv?: Record<string, string>;
  passwords?: string[];
  answers?: string[];
}

interface RunResult {
  code: number;
  out: string[];
  err: string[];
  opened: { url: string; token?: string }[];
  prompts: string[];
}

async function run(argv: string[], options: RunOptions = {}): Promise<RunResult> {
  const out: string[] = [];
  const err: string[] = [];
  const opened: { url: string; token?: string }[] = [];
  const prompts: string[] = [];
  const passwords = [...(options.passwords ?? [])];
  const answers = [...(options.answers ?? [])];

  const deps: AccountCliDeps = {
    argv,
    env: options.env ?? {},
    cwd: '/work/project',
    loadDotEnv: () => options.dotEnv ?? {},
    openClient: (url, token) => {
      opened.push({ url, token });
      return client;
    },
    readPassword: async (prompt) => {
      prompts.push(prompt);
      const next = passwords.shift();
      if (next === undefined) throw new Error('sin contraseña disponible');
      return next;
    },
    readLine: async (prompt) => {
      prompts.push(prompt);
      return answers.shift() ?? '';
    },
    out: (line) => out.push(line),
    err: (line) => err.push(line),
  };
  const code = await runAccountCli(deps);
  return { code, out, err, opened, prompts };
}

async function snapshot() {
  const accounts = (await client.execute('SELECT * FROM cuenta ORDER BY id_cuenta')).rows.map((r) => ({ ...r }));
  const sessions = (await client.execute('SELECT * FROM sesion ORDER BY token_hash')).rows.map((r) => ({ ...r }));
  return { accounts, sessions };
}

async function accountRow(username: string) {
  const result = await client.execute({ sql: 'SELECT * FROM cuenta WHERE username = ?', args: [username] });
  return result.rows[0] as Record<string, unknown> | undefined;
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('src/db.sql', 'utf8'));
  setDatabaseClient(null);
});

afterEach(() => {
  setDatabaseClient(null);
});

describe('account create', () => {
  it('creates an administrator by default when no accounts exist (env password)', async () => {
    const r = await run(['create', 'ana'], { env: { ACCOUNT_PASSWORD: PASSWORD } });

    expect(r.code).toBe(0);
    expect(r.err).toEqual([]);
    expect(r.out).toEqual(['Cuenta "ana" creada con tipo administrador.']);
    const row = await accountRow('ana');
    expect(row?.rol).toBe('administrador');
    expect(String(row?.password_hash)).toMatch(/^scrypt\$/);
  });

  it('defaults to normal when accounts already exist', async () => {
    await run(['create', 'ana'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    const r = await run(['create', 'beto'], { env: { ACCOUNT_PASSWORD: PASSWORD } });

    expect(r.code).toBe(0);
    expect(r.out).toEqual(['Cuenta "beto" creada con tipo normal.']);
    expect((await accountRow('beto'))?.rol).toBe('normal');
  });

  it('honours an explicit --role', async () => {
    await run(['create', 'ana'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    const r = await run(['create', 'beto', '--role', 'administrador'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    expect(r.code).toBe(0);
    expect(r.out).toEqual(['Cuenta "beto" creada con tipo administrador.']);

    const empty = await run(['create', 'cami', '--role=normal'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    expect(empty.out).toEqual(['Cuenta "cami" creada con tipo normal.']);
  });

  it('rejects an invalid --role without touching data', async () => {
    const before = await snapshot();
    const r = await run(['create', 'ana', '--role', 'root'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    expect(r.code).not.toBe(0);
    expect(r.err.join('\n')).toContain('administrador|normal');
    expect(await snapshot()).toEqual(before);
  });

  it('reads the password from the hidden prompt twice and never prints it', async () => {
    const r = await run(['create', 'ana'], { passwords: [PASSWORD, PASSWORD] });

    expect(r.code).toBe(0);
    expect(r.prompts).toEqual(['Contraseña: ', 'Repite la contraseña: ']);
    const all = [...r.out, ...r.err].join('\n');
    expect(all).not.toContain(PASSWORD);
    expect(all).not.toContain('scrypt$');
  });

  it('fails on password mismatch and stores nothing', async () => {
    const before = await snapshot();
    const r = await run(['create', 'ana'], { passwords: [PASSWORD, 'otra-clave-distinta'] });

    expect(r.code).toBe(1);
    expect(r.err).toEqual(['Error: Las contraseñas no coinciden.']);
    expect(await snapshot()).toEqual(before);
  });

  it('rejects a short password and stores nothing', async () => {
    const before = await snapshot();
    const r = await run(['create', 'ana'], { env: { ACCOUNT_PASSWORD: 'corta' } });

    expect(r.code).toBe(1);
    expect(r.err).toEqual(['Error: La contraseña debe tener al menos 10 caracteres.']);
    expect(await snapshot()).toEqual(before);
  });

  it('rejects a bad username and stores nothing', async () => {
    const before = await snapshot();
    const r = await run(['create', 'a b'], { env: { ACCOUNT_PASSWORD: PASSWORD } });

    expect(r.code).toBe(1);
    expect(r.err[0]).toMatch(/^Error: El usuario debe tener entre 3 y 32 caracteres/);
    expect(await snapshot()).toEqual(before);
  });

  it('rejects a duplicate username and leaves the original untouched', async () => {
    await run(['create', 'ana'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    const before = await snapshot();
    const r = await run(['create', 'ANA'], { env: { ACCOUNT_PASSWORD: 'otra-clave-larga-1' } });

    expect(r.code).toBe(1);
    expect(r.err).toEqual(['Error: Ya existe una cuenta con ese usuario.']);
    expect(await snapshot()).toEqual(before);
  });
});

describe('account reset-password', () => {
  async function seedWithSession() {
    await run(['create', 'ana'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    await run(['create', 'beto'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    const ana = (await accountRow('ana'))!;
    const beto = (await accountRow('beto'))!;
    const future = new Date(Date.now() + 3600_000).toISOString();
    for (const [hash, id] of [['t-ana', ana.id_cuenta], ['t-beto', beto.id_cuenta]] as const) {
      await client.execute({
        sql: 'INSERT INTO sesion (token_hash, id_cuenta, expira_en) VALUES (?, ?, ?)',
        args: [hash, id as number, future],
      });
    }
  }

  it('changes the hash, closes only that account sessions and says so', async () => {
    await seedWithSession();
    const oldHash = (await accountRow('ana'))!.password_hash;
    const betoHash = (await accountRow('beto'))!.password_hash;

    const r = await run(['reset-password', 'ana'], { env: { ACCOUNT_PASSWORD: 'nueva-clave-456' } });

    expect(r.code).toBe(0);
    expect(r.out).toEqual([
      'Contraseña de "ana" actualizada.',
      'Se cerraron todas las sesiones abiertas de esa cuenta.',
    ]);
    const row = (await accountRow('ana'))!;
    expect(row.password_hash).not.toBe(oldHash);
    expect(String(row.password_hash)).toMatch(/^scrypt\$/);
    expect((await accountRow('beto'))!.password_hash).toBe(betoHash);
    const sessions = (await client.execute('SELECT token_hash FROM sesion')).rows.map((s) => s.token_hash);
    expect(sessions).toEqual(['t-beto']);
    expect([...r.out, ...r.err].join('\n')).not.toContain('nueva-clave-456');
  });

  it('fails for an unknown account and changes nothing', async () => {
    await seedWithSession();
    const before = await snapshot();
    const r = await run(['reset-password', 'nadie'], { env: { ACCOUNT_PASSWORD: PASSWORD } });

    expect(r.code).toBe(1);
    expect(r.err).toEqual(['Error: No existe una cuenta con ese usuario.']);
    expect(await snapshot()).toEqual(before);
  });

  it('rejects a short password and keeps hash and sessions', async () => {
    await seedWithSession();
    const before = await snapshot();
    const r = await run(['reset-password', 'ana'], { env: { ACCOUNT_PASSWORD: 'corta' } });

    expect(r.code).toBe(1);
    expect(r.err).toEqual(['Error: La contraseña debe tener al menos 10 caracteres.']);
    expect(await snapshot()).toEqual(before);
  });

  it('fails on mismatch and keeps hash and sessions', async () => {
    await seedWithSession();
    const before = await snapshot();
    const r = await run(['reset-password', 'ana'], { passwords: ['nueva-clave-456', 'nueva-clave-789'] });

    expect(r.code).toBe(1);
    expect(r.err).toEqual(['Error: Las contraseñas no coinciden.']);
    expect(await snapshot()).toEqual(before);
  });
});

describe('target selection', () => {
  it('defaults to local data/local.db resolved from cwd', async () => {
    const r = await run(['create', 'ana'], { env: { ACCOUNT_PASSWORD: PASSWORD } });
    expect(r.opened).toEqual([{ url: 'file:/work/project/data/local.db', token: undefined }]);
  });

  it('ACCOUNT_DB_FILE overrides the local file (test/smoke only)', async () => {
    const r = await run(['create', 'ana'], { env: { ACCOUNT_PASSWORD: PASSWORD, ACCOUNT_DB_FILE: '/tmp/x.db' } });
    expect(r.opened).toEqual([{ url: 'file:/tmp/x.db', token: undefined }]);
  });

  it('never infers the target from process env TURSO_URL', async () => {
    const r = await run(['create', 'ana'], {
      env: { ACCOUNT_PASSWORD: PASSWORD, TURSO_URL: 'libsql://prod.example', TURSO_TOKEN: 't' },
    });
    expect(r.opened[0].url).toBe('file:/work/project/data/local.db');
  });

  it('--prod refuses without TURSO_URL/TURSO_TOKEN in .env and opens nothing', async () => {
    const variants: Record<string, string>[] = [{}, { TURSO_URL: 'libsql://p.example' }, { TURSO_TOKEN: 't' }, { TURSO_URL: 'file:x.db', TURSO_TOKEN: 't' }];
    for (const dotEnv of variants) {
      const r = await run(['create', 'ana', '--prod'], { env: { ACCOUNT_PASSWORD: PASSWORD }, dotEnv, answers: ['yes'] });
      expect(r.code).toBe(1);
      expect(r.err).toEqual(['Error: --prod requiere TURSO_URL (libsql://) y TURSO_TOKEN en .env']);
      expect(r.opened).toEqual([]);
    }
  });

  it('--prod prints the target and aborts unless the user types yes', async () => {
    const dotEnv = { TURSO_URL: 'libsql://p.example', TURSO_TOKEN: 'tok' };
    const before = await snapshot();
    const r = await run(['create', 'ana', '--prod'], { env: { ACCOUNT_PASSWORD: PASSWORD }, dotEnv, answers: ['no'] });

    expect(r.out).toContain('PRODUCCIÓN: libsql://p.example');
    expect(r.code).toBe(1);
    expect(r.err).toEqual(['Error: Operación cancelada.']);
    expect(await snapshot()).toEqual(before);
    expect(r.out.join('\n')).not.toContain('tok');
  });

  it('--prod proceeds with yes, using .env credentials', async () => {
    const dotEnv = { TURSO_URL: 'libsql://p.example', TURSO_TOKEN: 'tok' };
    const r = await run(['create', 'ana', '--prod'], { env: { ACCOUNT_PASSWORD: PASSWORD }, dotEnv, answers: ['yes'] });

    expect(r.code).toBe(0);
    expect(r.opened).toEqual([{ url: 'libsql://p.example', token: 'tok' }]);
    expect(r.out).toEqual(['PRODUCCIÓN: libsql://p.example', 'Cuenta "ana" creada con tipo administrador.']);
    expect(r.prompts).toEqual(['Escribe "yes" para continuar: ']);
  });
});

describe('usage', () => {
  const cases: [string, string[]][] = [
    ['no command', []],
    ['unknown command', ['borrar', 'ana']],
    ['create without username', ['create']],
    ['reset-password without username', ['reset-password']],
    ['unknown flag', ['create', 'ana', '--foo']],
    ['extra positional', ['create', 'ana', 'beto']],
  ];

  it.each(cases)('%s prints usage and exits non-zero without opening the database', async (_name, argv) => {
    const r = await run(argv, { env: { ACCOUNT_PASSWORD: PASSWORD } });
    expect(r.code).toBe(2);
    expect(r.err.join('\n')).toContain('Uso:');
    expect(r.opened).toEqual([]);
  });

  it('--help prints usage including ACCOUNT_PASSWORD and ACCOUNT_DB_FILE, exit 0', async () => {
    const r = await run(['--help']);
    expect(r.code).toBe(0);
    const text = r.out.join('\n');
    expect(text).toContain('Uso:');
    expect(text).toContain('ACCOUNT_PASSWORD');
    expect(text).toContain('ACCOUNT_DB_FILE');
    expect(r.opened).toEqual([]);
  });
});
