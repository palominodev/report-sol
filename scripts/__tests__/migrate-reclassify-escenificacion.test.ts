import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import { reclassifyEscenificacionParts } from '../migrate-reclassify-escenificacion';

type DatabaseClient = ReturnType<typeof createClient>;

async function freshClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
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
      punto TEXT
    )
  `);
  await client.execute(`
    CREATE TABLE presentation_assignment (
      id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
      id_part INTEGER NOT NULL,
      id_week INTEGER NOT NULL,
      id_usuario INTEGER NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('presentador','companero')),
      estado TEXT NOT NULL DEFAULT 'draft'
    )
  `);
  return client;
}

async function insertPart(client: DatabaseClient, fuente: string, tipo: string): Promise<number> {
  const result = await client.execute({
    sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto)
          VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL)`,
    args: [1, 1, tipo, 'SEAMOS_MEJORES_MAESTROS', 5, fuente],
  });
  return Number(result.lastInsertRowid);
}

describe('migrate-reclassify-escenificacion', () => {
  it('reclassifies discurso parts whose fuente mentions Escenificación', async () => {
    const client = await freshClient();
    const idPart = await insertPart(client, 'Explique sus creencias (Escenificación)', 'discurso');

    const updated = await reclassifyEscenificacionParts(client);

    expect(updated).toBe(1);
    const rows = await client.execute('SELECT tipo FROM presentation_part WHERE id_part = ?', [idPart]);
    expect((rows.rows[0] as { tipo: string }).tipo).toBe('escenificacion');
  });

  it('leaves other discurso parts untouched', async () => {
    const client = await freshClient();
    const escenificado = await insertPart(client, 'Explique sus creencias (Escenificación)', 'discurso');
    const adaptables = await insertPart(client, 'Seamos adaptables', 'discurso');

    const updated = await reclassifyEscenificacionParts(client);

    expect(updated).toBe(1);
    const rows = await client.execute('SELECT id_part, tipo FROM presentation_part ORDER BY id_part');
    expect((rows.rows as unknown as { id_part: number; tipo: string }[])).toEqual([
      { id_part: escenificado, tipo: 'escenificacion' },
      { id_part: adaptables, tipo: 'discurso' },
    ]);
  });

  it('is idempotent: the second run updates nothing', async () => {
    const client = await freshClient();
    await insertPart(client, 'Explique sus creencias (Escenificación)', 'discurso');
    await reclassifyEscenificacionParts(client);

    const updatedAgain = await reclassifyEscenificacionParts(client);

    expect(updatedAgain).toBe(0);
  });

  it('retains the companion assignment of the reclassified part (5 parts → still 8 assignments shape)', async () => {
    const client = await freshClient();
    const idPart = await insertPart(client, 'Explique sus creencias (Escenificación)', 'discurso');
    await client.execute({
      sql: 'INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado) VALUES (?, ?, ?, ?, ?)',
      args: [idPart, 1, 10, 'presentador', 'confirmed'],
    });
    await client.execute({
      sql: 'INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado) VALUES (?, ?, ?, ?, ?)',
      args: [idPart, 1, 11, 'companero', 'confirmed'],
    });

    const updated = await reclassifyEscenificacionParts(client);

    expect(updated).toBe(1);
    const assignments = await client.execute(
      'SELECT rol, id_usuario FROM presentation_assignment WHERE id_part = ? ORDER BY rol',
      [idPart]
    );
    expect(assignments.rows).toHaveLength(2);
    expect((assignments.rows as unknown as { rol: string; id_usuario: number }[])).toEqual([
      { rol: 'companero', id_usuario: 11 },
      { rol: 'presentador', id_usuario: 10 },
    ]);
  });
});