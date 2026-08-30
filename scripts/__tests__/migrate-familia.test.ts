import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import { ensureFamiliaIdColumn } from '../migrate-familia';

type DatabaseClient = ReturnType<typeof createClient>;

/** Fresh in-memory DB with a `usuario` table shaped like the pre-migration schema. */
async function freshClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
  await client.execute(`
    CREATE TABLE usuario (
      id_usuario INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      genero TEXT CHECK(genero IN ('masculino','femenino'))
    )
  `);
  return client;
}

async function hasFamiliaIdColumn(client: DatabaseClient): Promise<boolean> {
  const info = await client.execute('PRAGMA table_info(usuario)');
  return (info.rows as unknown as { name: string }[]).some((row) => row.name === 'familia_id');
}

describe('migrate-familia', () => {
  it('adds the familia_id INTEGER column when it is missing', async () => {
    const client = await freshClient();

    const added = await ensureFamiliaIdColumn(client);

    expect(added).toBe(true);
    expect(await hasFamiliaIdColumn(client)).toBe(true);

    // The column must be typed INTEGER (NULL-allowed, FK-able later per design).
    const info = await client.execute('PRAGMA table_info(usuario)');
    const familia = (info.rows as unknown as { name: string; type: string }[]).find((row) => row.name === 'familia_id');
    expect(familia?.type).toBe('INTEGER');
  });

  it('is a no-op on the second run (idempotent)', async () => {
    const client = await freshClient();
    await ensureFamiliaIdColumn(client);

    const addedAgain = await ensureFamiliaIdColumn(client);

    expect(addedAgain).toBe(false);
    const info = await client.execute('PRAGMA table_info(usuario)');
    const familiaColumns = (info.rows as unknown as { name: string }[]).filter((row) => row.name === 'familia_id');
    expect(familiaColumns).toHaveLength(1);
  });

  it('preserves existing usuario rows when the column is added', async () => {
    const client = await freshClient();
    await client.execute({
      sql: "INSERT INTO usuario (nombre, apellido, genero) VALUES ('Sandro', 'Valeriano', 'masculino')",
      args: [],
    });

    await ensureFamiliaIdColumn(client);

    const rows = await client.execute('SELECT id_usuario, nombre FROM usuario');
    expect(rows.rows).toHaveLength(1);
    expect((rows.rows[0] as { nombre: string }).nombre).toBe('Sandro');
  });
});