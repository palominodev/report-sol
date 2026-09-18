import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import { ensureSalaColumn } from '../db-migrate-prod';

type DatabaseClient = ReturnType<typeof createClient>;

/**
 * Mirrors src/db.sql presentation_part BEFORE the salas change: no sala
 * column at all (the shape production has today). The guarded ALTER must
 * add the column with its 'A','B' CHECK without touching existing rows.
 */
async function freshClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
  await client.execute(`
    CREATE TABLE presentation_week (
      id_week INTEGER PRIMARY KEY AUTOINCREMENT,
      semana TEXT NOT NULL UNIQUE,
      issue TEXT NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'no_generada',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);
  await client.execute(`
    CREATE TABLE presentation_part (
      id_part INTEGER PRIMARY KEY AUTOINCREMENT,
      id_week INTEGER NOT NULL,
      orden INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      seccion TEXT NOT NULL,
      duracion_min INTEGER NOT NULL,
      escenario TEXT,
      fuente TEXT NOT NULL,
      leccion INTEGER,
      punto TEXT,
      UNIQUE(id_week, tipo, orden),
      FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
    )
  `);
  await client.execute(`
    INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado)
    VALUES ('2026-07-06', 'mwb', '2026-07-06', '2026-07-12', 'confirmada')
  `);
  await client.execute(`
    INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente)
    VALUES (1, 1, 'lectura_biblia', 'TESOROS_DE_LA_BIBLIA', 4, 'lmd')
  `);
  return client;
}

async function partTableSql(client: DatabaseClient): Promise<string> {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE name='presentation_part'",
    args: [],
  });
  return (result.rows[0] as unknown as { sql: string }).sql;
}

describe('db-migrate-prod sala column', () => {
  it('adds sala with the A/B CHECK to an old-shape presentation_part (SQL-text assert mirroring the migrate post-check)', async () => {
    const client = await freshClient();
    expect(await partTableSql(client)).not.toContain('sala');

    const added = await ensureSalaColumn(client);

    expect(added).toBe(true);
    const sql = await partTableSql(client);
    expect(sql).toContain('sala');
    expect(sql).toContain("'A'");
    expect(sql).toContain("'B'");
  });

  it('is a no-op on the second run (guarded, idempotent)', async () => {
    const client = await freshClient();
    await ensureSalaColumn(client);
    const sqlAfterFirstRun = await partTableSql(client);

    const addedAgain = await ensureSalaColumn(client);

    expect(addedAgain).toBe(false);
    expect(await partTableSql(client)).toBe(sqlAfterFirstRun);
  });

  it('keeps existing rows with sala NULL and enforces the CHECK on new values', async () => {
    const client = await freshClient();
    await ensureSalaColumn(client);

    const existing = await client.execute('SELECT sala FROM presentation_part');
    expect(existing.rows[0].sala).toBeNull();

    await client.execute(`
      INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente, sala)
      VALUES (1, 2, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, 'lmd', 'A')
    `);
    await client.execute(`
      INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente, sala)
      VALUES (1, 3, 'que_diria', 'SEAMOS_MEJORES_MAESTROS', 4, 'lmd', NULL)
    `);
    await expect(
      client.execute(`
        INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente, sala)
        VALUES (1, 4, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, 'lmd', 'C')
      `)
    ).rejects.toThrow();
  });
});
