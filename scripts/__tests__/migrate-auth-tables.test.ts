import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { describe, expect, it, vi } from 'vitest';
import {
  AUTH_OBJECTS,
  authStatementsFromSchema,
  ensureAuthTables,
  inspectAuthTables,
  runAuthMigrationCli,
  type AuthMigrationCliDeps,
} from '../migrate-auth-tables';

type Client = ReturnType<typeof createClient>;

async function memoryClient(): Promise<Client> {
  return createClient({ url: ':memory:' });
}

/** A database that looks like production before this feature: old tables, no auth tables. */
async function legacyDatabase(): Promise<Client> {
  const client = await memoryClient();
  await client.executeMultiple(`
    CREATE TABLE usuario (id_usuario INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL);
    CREATE TABLE presentation_week (id_week INTEGER PRIMARY KEY AUTOINCREMENT, semana TEXT NOT NULL UNIQUE);
    CREATE TABLE presentation_part (
      id_part INTEGER PRIMARY KEY AUTOINCREMENT, id_week INTEGER NOT NULL, orden INTEGER NOT NULL, sala TEXT,
      UNIQUE(id_week, orden)
    );
    INSERT INTO usuario(nombre) VALUES ('Ana'), ('Beto');
    INSERT INTO presentation_week(semana) VALUES ('2026-10-05');
    INSERT INTO presentation_part(id_week, orden, sala) VALUES (1, 1, NULL);
  `);
  return client;
}

/** The command closes its client when it finishes; the test still needs to look at the database afterwards. */
function keepOpen(client: Client): Client {
  return new Proxy(client, {
    get(target, property) {
      if (property === 'close') return () => {};
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

async function schemaSnapshot(client: Client, exceptNames: string[] = []) {
  const rows = (await client.execute("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name"))
    .rows as unknown as Array<{ type: string; name: string; sql: string | null }>;
  return rows.filter((r) => !exceptNames.includes(r.name)).map((r) => ({ type: r.type, name: r.name, sql: r.sql }));
}

async function count(client: Client, table: string): Promise<number> {
  return Number((await client.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
}

describe('authStatementsFromSchema', () => {
  it('takes exactly the auth objects out of src/db.sql, so the schema is written once', () => {
    const statements = authStatementsFromSchema(readFileSync('src/db.sql', 'utf8'));

    expect(statements).toHaveLength(AUTH_OBJECTS.length);
    expect(AUTH_OBJECTS).toEqual(['cuenta', 'sesion', 'idx_sesion_cuenta']);
    for (const statement of statements) expect(statement).toMatch(/IF NOT EXISTS/i);
  });

  it('fails loudly if an auth object is missing from the schema file', () => {
    expect(() => authStatementsFromSchema('CREATE TABLE IF NOT EXISTS usuario (id INTEGER);')).toThrow(/cuenta/);
  });
});

describe('ensureAuthTables', () => {
  it('creates only cuenta, sesion and the session index on a database that has none', async () => {
    const client = await legacyDatabase();

    const result = await ensureAuthTables(client);

    expect(result).toEqual({ created: ['cuenta', 'sesion', 'idx_sesion_cuenta'], alreadyPresent: [] });
    const names = (await schemaSnapshot(client)).map((o) => o.name);
    expect(names).toEqual(expect.arrayContaining(['cuenta', 'sesion', 'idx_sesion_cuenta']));
  });

  it('leaves every existing table, index and row exactly as they were', async () => {
    const client = await legacyDatabase();
    const before = await schemaSnapshot(client);
    const rowsBefore = [await count(client, 'usuario'), await count(client, 'presentation_week'), await count(client, 'presentation_part')];

    await ensureAuthTables(client);

    expect(await schemaSnapshot(client, [...AUTH_OBJECTS])).toEqual(before);
    expect([await count(client, 'usuario'), await count(client, 'presentation_week'), await count(client, 'presentation_part')]).toEqual(rowsBefore);
  });

  it('does not create the sala expression index that the full schema file would add', async () => {
    const client = await legacyDatabase();

    await ensureAuthTables(client);

    const names = (await schemaSnapshot(client)).map((o) => o.name);
    expect(names).not.toContain('ux_part_week_tipo_orden_sala');
  });

  it('builds the same columns as the full schema file', async () => {
    const reference = await memoryClient();
    await reference.executeMultiple(readFileSync('src/db.sql', 'utf8'));
    const client = await legacyDatabase();

    await ensureAuthTables(client);

    for (const table of ['cuenta', 'sesion']) {
      const columns = async (c: Client) =>
        (await c.execute(`PRAGMA table_info(${table})`)).rows.map((r) => [r.name, r.type, r.notnull, r.pk]);
      expect(await columns(client)).toEqual(await columns(reference));
    }
  });

  it('is safe to run twice: the second run changes nothing and keeps the accounts', async () => {
    const client = await legacyDatabase();
    await ensureAuthTables(client);
    await client.execute("INSERT INTO cuenta(username, password_hash, rol) VALUES ('ana', 'h', 'administrador')");
    const before = await schemaSnapshot(client);

    const second = await ensureAuthTables(client);

    expect(second).toEqual({ created: [], alreadyPresent: ['cuenta', 'sesion', 'idx_sesion_cuenta'] });
    expect(await schemaSnapshot(client)).toEqual(before);
    expect(await count(client, 'cuenta')).toBe(1);
  });

  it('refuses a pre-existing cuenta table with a different shape and writes nothing', async () => {
    const client = await legacyDatabase();
    await client.execute('CREATE TABLE cuenta (id INTEGER PRIMARY KEY, correo TEXT)');
    const before = await schemaSnapshot(client);

    await expect(ensureAuthTables(client)).rejects.toThrow(/cuenta/);

    expect(await schemaSnapshot(client)).toEqual(before);
  });
});

describe('inspectAuthTables', () => {
  it('reports what exists without creating anything', async () => {
    const client = await legacyDatabase();
    const before = await schemaSnapshot(client);

    expect(await inspectAuthTables(client)).toEqual({ present: [], missing: ['cuenta', 'sesion', 'idx_sesion_cuenta'] });
    expect(await schemaSnapshot(client)).toEqual(before);

    await ensureAuthTables(client);
    expect(await inspectAuthTables(client)).toEqual({ present: ['cuenta', 'sesion', 'idx_sesion_cuenta'], missing: [] });
  });
});

describe('runAuthMigrationCli', () => {
  async function setup(overrides: Partial<AuthMigrationCliDeps> & { argv: string[] }) {
    const client = await legacyDatabase();
    const out: string[] = [];
    const err: string[] = [];
    const openClient = vi.fn((_url: string, _token?: string) => keepOpen(client));
    const readLine = vi.fn(async (_prompt: string) => 'yes');
    const deps: AuthMigrationCliDeps = {
      env: {},
      cwd: '/work',
      loadDotEnv: () => ({ TURSO_URL: 'libsql://prod-example.turso.io', TURSO_TOKEN: 'secret-token' }),
      openClient,
      readLine,
      out: (line) => out.push(line),
      err: (line) => err.push(line),
      ...overrides,
    };
    const code = await runAuthMigrationCli(deps);
    return { code, out, err, openClient, readLine, client };
  }

  it('without an explicit target it refuses and touches nothing (the target is never inferred)', async () => {
    const { code, err, openClient } = await setup({ argv: [] });

    expect(code).toBe(2);
    expect(err.join('\n')).toMatch(/--prod|--db/);
    expect(openClient).not.toHaveBeenCalled();
  });

  it('with --prod it shows the destination, asks for "yes", and only then creates the tables', async () => {
    const { code, out, readLine, openClient, client } = await setup({ argv: ['--prod'] });

    expect(code).toBe(0);
    expect(out.join('\n')).toContain('libsql://prod-example.turso.io');
    expect(readLine).toHaveBeenCalledTimes(1);
    expect(openClient).toHaveBeenCalledWith('libsql://prod-example.turso.io', 'secret-token');
    expect((await inspectAuthTables(client)).missing).toEqual([]);
  });

  it('never prints the Turso token', async () => {
    const { out, err } = await setup({ argv: ['--prod'] });

    expect([...out, ...err].join('\n')).not.toContain('secret-token');
  });

  it('any answer other than "yes" cancels before connecting or writing', async () => {
    const { code, err, openClient } = await setup({ argv: ['--prod'], readLine: async () => 'y' });

    expect(code).toBe(1);
    expect(err.join('\n')).toMatch(/cancelad/i);
    expect(openClient).not.toHaveBeenCalled();
  });

  it('--prod without credentials in .env fails before asking anything', async () => {
    const { code, err, readLine, openClient } = await setup({ argv: ['--prod'], loadDotEnv: () => ({}) });

    expect(code).toBe(1);
    expect(err.join('\n')).toMatch(/TURSO_URL/);
    expect(readLine).not.toHaveBeenCalled();
    expect(openClient).not.toHaveBeenCalled();
  });

  it('--check --prod only reports, never asks for confirmation and never writes', async () => {
    const { code, out, readLine, client } = await setup({ argv: ['--prod', '--check'] });

    expect(code).toBe(0);
    expect(readLine).not.toHaveBeenCalled();
    expect(out.join('\n')).toMatch(/faltan|missing/i);
    expect((await inspectAuthTables(client)).present).toEqual([]);
  });

  it('--db <path> targets that file without any confirmation', async () => {
    const { code, openClient, readLine } = await setup({ argv: ['--db', 'data/clone-test.db'] });

    expect(code).toBe(0);
    expect(readLine).not.toHaveBeenCalled();
    expect(openClient).toHaveBeenCalledWith('file:/work/data/clone-test.db', undefined);
  });

  it('reports a failure with exit code 1 and writes nothing when the table shape is unexpected', async () => {
    const client = await legacyDatabase();
    await client.execute('CREATE TABLE cuenta (id INTEGER PRIMARY KEY, correo TEXT)');
    const { code, err } = await (async () => {
      const err: string[] = [];
      const code = await runAuthMigrationCli({
        argv: ['--db', 'x.db'],
        env: {},
        cwd: '/work',
        loadDotEnv: () => ({}),
        openClient: () => keepOpen(client),
        readLine: async () => 'yes',
        out: () => {},
        err: (line) => err.push(line),
      });
      return { code, err };
    })();

    expect(code).toBe(1);
    expect(err.join('\n')).toMatch(/cuenta/);
    expect((await inspectAuthTables(client)).present).toEqual(['cuenta']);
  });
});
