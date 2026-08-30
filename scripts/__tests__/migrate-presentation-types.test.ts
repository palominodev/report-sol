import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import { rebuildPresentationPartCheck } from '../migrate-presentation-types';

type DatabaseClient = ReturnType<typeof createClient>;

/**
 * Mirrors src/db.sql presentation tables BEFORE the widening: the part CHECK
 * accepts only the original five tipos. Includes the assignment child table so
 * the rebuild's FK behavior is exercised (drop/rename must not destroy rows).
 */
async function freshClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
  await client.execute('PRAGMA foreign_keys = ON');
  await client.execute(`
    CREATE TABLE usuario (
      id_usuario INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE presentation_week (
      id_week INTEGER PRIMARY KEY AUTOINCREMENT,
      semana TEXT NOT NULL UNIQUE,
      issue TEXT NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'no_generada'
        CHECK(estado IN ('no_generada','borrador','confirmada')),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);
  await client.execute(`
    CREATE TABLE presentation_part (
      id_part INTEGER PRIMARY KEY AUTOINCREMENT,
      id_week INTEGER NOT NULL,
      orden INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN
        ('lectura_biblia','empiece_conversaciones','haga_revisitas','haga_discipulos','discurso')),
      seccion TEXT NOT NULL CHECK(seccion IN ('TESOROS_DE_LA_BIBLIA','SEAMOS_MEJORES_MAESTROS')),
      duracion_min INTEGER NOT NULL CHECK(duracion_min > 0),
      escenario TEXT,
      fuente TEXT NOT NULL,
      leccion INTEGER,
      punto TEXT,
      UNIQUE(id_week, tipo, orden),
      FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
    )
  `);
  await client.execute('CREATE INDEX IF NOT EXISTS idx_part_week ON presentation_part(id_week)');
  await client.execute(`
    CREATE TABLE presentation_assignment (
      id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
      id_part INTEGER NOT NULL,
      id_week INTEGER NOT NULL,
      id_usuario INTEGER NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('presentador','companero')),
      estado TEXT NOT NULL DEFAULT 'draft' CHECK(estado IN ('draft','confirmed','manual')),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      UNIQUE(id_part, rol),
      FOREIGN KEY (id_part) REFERENCES presentation_part(id_part) ON DELETE CASCADE,
      FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE,
      FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
    )
  `);
  return client;
}

async function partCheckSql(client: DatabaseClient): Promise<string> {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'presentation_part'",
    args: [],
  });
  return (result.rows[0] as { sql: string }).sql;
}

async function seedPartWithAssignment(client: DatabaseClient): Promise<number> {
  const week = await client.execute({
    sql: 'INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, ?)',
    args: ['2026-07-27', 'mwb-2026-07-27', '2026-07-27', '2026-08-02', 'confirmada'],
  });
  const idWeek = Number(week.lastInsertRowid);
  const user = await client.execute({
    sql: "INSERT INTO usuario (nombre, apellido) VALUES ('Sandro', 'Valeriano')",
    args: [],
  });
  const idUser = Number(user.lastInsertRowid);
  const part = await client.execute({
    sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto)
          VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL)`,
    args: [idWeek, 1, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, 'Explique sus creencias'],
  });
  const idPart = Number(part.lastInsertRowid);
  await client.execute({
    sql: 'INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado) VALUES (?, ?, ?, ?, ?)',
    args: [idPart, idWeek, idUser, 'presentador', 'confirmed'],
  });
  return idPart;
}

describe('migrate-presentation-types', () => {
  it('widens the presentation_part CHECK to accept escenificacion AND que_diria', async () => {
    const client = await freshClient();
    expect(await partCheckSql(client)).not.toContain('escenificacion');

    const rebuilt = await rebuildPresentationPartCheck(client);

    expect(rebuilt).toBe(true);
    const sql = await partCheckSql(client);
    expect(sql).toContain('escenificacion');
    expect(sql).toContain('que_diria');
  });

  it('preserves existing parts and their assignment rows through the rebuild', async () => {
    const client = await freshClient();
    const idPart = await seedPartWithAssignment(client);

    await rebuildPresentationPartCheck(client);

    const parts = await client.execute('SELECT id_part, tipo FROM presentation_part');
    expect(parts.rows).toHaveLength(1);
    expect((parts.rows[0] as { id_part: number; tipo: string }).id_part).toBe(idPart);
    expect((parts.rows[0] as { tipo: string }).tipo).toBe('discurso');

    // Child rows survived the DROP/RENAME with foreign keys disabled.
    const assignments = await client.execute('SELECT COUNT(*) AS count FROM presentation_assignment');
    expect(Number((assignments.rows[0] as { count: number }).count)).toBe(1);
  });

  it('is a no-op on the second run (idempotent)', async () => {
    const client = await freshClient();
    await rebuildPresentationPartCheck(client);
    const sqlAfterFirstRun = await partCheckSql(client);

    const rebuiltAgain = await rebuildPresentationPartCheck(client);

    expect(rebuiltAgain).toBe(false);
    expect(await partCheckSql(client)).toBe(sqlAfterFirstRun);
  });

  it('accepts inserts of the two new tipos after the rebuild', async () => {
    const client = await freshClient();
    await client.execute({
      sql: "INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado) VALUES ('2026-08-03', 'mwb-2026-08-03', '2026-08-03', '2026-08-09', 'borrador')",
      args: [],
    });

    await rebuildPresentationPartCheck(client);

    await client.execute({
      sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto)
            VALUES (1, 1, 'escenificacion', 'SEAMOS_MEJORES_MAESTROS', 5, NULL, 'Escenificación', NULL, NULL)`,
      args: [],
    });
    await client.execute({
      sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto)
            VALUES (1, 2, 'que_diria', 'SEAMOS_MEJORES_MAESTROS', 5, NULL, '¿Qué diría?', NULL, NULL)`,
      args: [],
    });

    const parts = await client.execute('SELECT tipo FROM presentation_part ORDER BY orden');
    expect((parts.rows as unknown as { tipo: string }[]).map((r) => r.tipo)).toEqual([
      'escenificacion',
      'que_diria',
    ]);
  });

  it('leaves the schema with zero foreign key violations', async () => {
    const client = await freshClient();
    await seedPartWithAssignment(client);

    await rebuildPresentationPartCheck(client);

    const violations = await client.execute('PRAGMA foreign_key_check');
    expect(violations.rows).toHaveLength(0);
  });
});