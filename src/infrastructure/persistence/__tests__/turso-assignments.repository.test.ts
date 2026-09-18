import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@libsql/client';
import { TursoAssignmentsRepository } from '../turso-assignments.repository';
import { setDatabaseClient } from '../database.client';

type DatabaseClient = ReturnType<typeof createClient>;

async function freshClient(): Promise<DatabaseClient> {
  const client = createClient({ url: ':memory:' });
  await client.execute('CREATE TABLE usuario (id_usuario INTEGER PRIMARY KEY)');
  await client.execute('INSERT INTO usuario (id_usuario) VALUES (1)');
  await client.execute('INSERT INTO usuario (id_usuario) VALUES (2)');
  await client.execute(`CREATE TABLE presentation_week (
    id_week INTEGER PRIMARY KEY AUTOINCREMENT,
    semana TEXT NOT NULL UNIQUE,
    issue TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'no_generada'
  )`);
  await client.execute(`CREATE TABLE presentation_part (
    id_part INTEGER PRIMARY KEY AUTOINCREMENT,
    id_week INTEGER NOT NULL REFERENCES presentation_week(id_week),
    orden INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    seccion TEXT NOT NULL,
    duracion_min INTEGER NOT NULL,
    escenario TEXT,
    fuente TEXT NOT NULL,
    leccion INTEGER,
    punto TEXT,
    UNIQUE(id_week, tipo, orden)
  )`);
  await client.execute(`CREATE TABLE presentation_assignment (
    id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_part INTEGER NOT NULL REFERENCES presentation_part(id_part),
    id_week INTEGER NOT NULL REFERENCES presentation_week(id_week),
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
    rol TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'draft',
    UNIQUE(id_part, rol)
  )`);
  return client;
}

async function seedWeekWithPart(
  client: DatabaseClient,
  semana: string,
  fechaInicio: string,
  tipo: string
): Promise<{ id_week: number; id_part: number }> {
  const week = await client.execute({
    sql: `INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado)
      VALUES (?, 'LMD', ?, ?, 'confirmada') RETURNING id_week`,
    args: [semana, fechaInicio, fechaInicio],
  });
  const id_week = Number(week.rows[0].id_week);
  const part = await client.execute({
    sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente)
      VALUES (?, 1, ?, 'SEAMOS_MEJORES_MAESTROS', 5, 'lmd') RETURNING id_part`,
    args: [id_week, tipo],
  });
  return { id_week, id_part: Number(part.rows[0].id_part) };
}

async function assign(
  client: DatabaseClient,
  id_part: number,
  id_week: number,
  id_usuario: number,
  rol: string
): Promise<void> {
  await client.execute({
    sql: `INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol)
      VALUES (?, ?, ?, ?)`,
    args: [id_part, id_week, id_usuario, rol],
  });
}

afterEach(() => {
  setDatabaseClient(null);
});

describe('TursoAssignmentsRepository.findRecentAssignments', () => {
  it('projects exact tipo from presentation_part onto each history row', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const discurso = await seedWeekWithPart(client, '2026/07/01', '2026-07-01', 'discurso');
    const lectura = await seedWeekWithPart(client, '2026/07/08', '2026-07-08', 'lectura_biblia');
    await assign(client, discurso.id_part, discurso.id_week, 1, 'presentador');
    await assign(client, lectura.id_part, lectura.id_week, 2, 'presentador');

    const rows = await repo.findRecentAssignments({ desde: '2026-01-01' });

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id_part === discurso.id_part)?.tipo).toBe('discurso');
    expect(rows.find((r) => r.id_part === lectura.id_part)?.tipo).toBe('lectura_biblia');
  });

  it('maps the full AssignmentHistoryRow shape used by the 6-month windows', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const { id_week, id_part } = await seedWeekWithPart(
      client,
      '2026/07/01',
      '2026-07-01',
      'explique_sus_creencias'
    );
    await assign(client, id_part, id_week, 1, 'presentador');

    const rows = await repo.findRecentAssignments({ desde: '2026-01-01' });

    expect(rows).toEqual([
      { id_part, id_week, id_usuario: 1, rol: 'presentador', tipo: 'explique_sus_creencias' },
    ]);
  });

  it('includes only weeks inside the desde window, ordered by fecha_inicio', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const older = await seedWeekWithPart(client, '2026/06/22', '2026-06-22', 'discurso');
    const edge = await seedWeekWithPart(client, '2026/07/01', '2026-07-01', 'que_diria');
    const newer = await seedWeekWithPart(client, '2026/07/08', '2026-07-08', 'lectura_biblia');
    for (const w of [older, edge, newer]) {
      await assign(client, w.id_part, w.id_week, 1, 'presentador');
    }

    const rows = await repo.findRecentAssignments({ desde: '2026-07-01' });

    // Edge week (fecha_inicio == desde) is included, older week is excluded.
    expect(rows.map((r) => r.id_week)).toEqual([edge.id_week, newer.id_week]);
  });

  it('keeps both presentador and companero rows for a two-person part', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const { id_week, id_part } = await seedWeekWithPart(
      client,
      '2026/07/01',
      '2026-07-01',
      'explique_sus_creencias'
    );
    await assign(client, id_part, id_week, 1, 'presentador');
    await assign(client, id_part, id_week, 2, 'companero');

    const rows = await repo.findRecentAssignments({ desde: '2026-01-01' });

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.rol).sort()).toEqual(['companero', 'presentador']);
    expect(rows.every((r) => r.id_part === id_part && r.tipo === 'explique_sus_creencias')).toBe(true);
  });
});