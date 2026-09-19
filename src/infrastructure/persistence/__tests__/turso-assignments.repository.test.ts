import { describe, it, expect, afterEach } from 'vitest';
import { createClient } from '@libsql/client';
import { TursoAssignmentsRepository } from '../turso-assignments.repository';
import { setDatabaseClient } from '../database.client';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';

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
    sala TEXT
  )`);
  // Sala-aware expression unique index — mirrors the post-migration shape
  // (no table-level UNIQUE): one row per (week, tipo, orden) per sala value,
  // with NULL as its own slot via COALESCE, so an A original and its B clone
  // coexist while same-slot duplicates are blocked.
  await client.execute(`CREATE UNIQUE INDEX ux_part_week_tipo_orden_sala
    ON presentation_part(id_week, tipo, orden, COALESCE(sala, ''))`);
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
      { id_part, id_week, id_usuario: 1, rol: 'presentador', tipo: 'explique_sus_creencias', sala: null },
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

  it('projects sala from presentation_part onto each history row, NULL passes through', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const { id_week, id_part } = await seedWeekWithPart(
      client,
      '2026/07/01',
      '2026-07-01',
      'explique_sus_creencias'
    );
    await client.execute({ sql: 'UPDATE presentation_part SET sala = ? WHERE id_part = ?', args: ['B', id_part] });
    await assign(client, id_part, id_week, 1, 'presentador');

    const nula = await seedWeekWithPart(client, '2026/07/08', '2026-07-08', 'discurso');
    await assign(client, nula.id_part, nula.id_week, 2, 'presentador');

    const rows = await repo.findRecentAssignments({ desde: '2026-01-01' });

    expect(rows.find((r) => r.id_part === id_part)?.sala).toBe('B');
    expect(rows.find((r) => r.id_part === nula.id_part)?.sala).toBeNull();
  });
});

describe('TursoAssignmentsRepository sala projection (toPart/upsertWeek)', () => {
  function week(fecha: string, semana: string): MeetingWeek {
    return new MeetingWeek(0, semana, 'LMD', fecha, fecha, 'no_generada');
  }

  function part(orden: number, tipo: PresentationPart['tipo'], sala: PresentationPart['sala']): PresentationPart {
    return new PresentationPart(0, 0, orden, tipo, 'SEAMOS_MEJORES_MAESTROS', 5, null, new SourceRef('lmd'), sala);
  }

  it('toPart maps sala through findPartsByWeek, NULL never defaulted', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const stamped = await seedWeekWithPart(client, '2026/07/01', '2026-07-01', 'discurso');
    await client.execute({ sql: 'UPDATE presentation_part SET sala = ? WHERE id_part = ?', args: ['A', stamped.id_part] });
    const nula = await seedWeekWithPart(client, '2026/07/08', '2026-07-08', 'discurso');

    const stampedParts = await repo.findPartsByWeek(stamped.id_week);
    const nulaParts = await repo.findPartsByWeek(nula.id_week);

    expect(stampedParts[0].sala).toBe('A');
    expect(nulaParts[0].sala).toBeNull();
  });

  it('upsertWeek persists sala on fresh parts', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', 'B')]);

    const parts = await repo.findPartsByWeek(id_week);
    expect(parts[0].sala).toBe('B');
  });

  it('upsertWeek COALESCE preserves a stamped sala across a NULL re-upsert (scraper sync erosion guard)', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    // First sync carries the known sala; backfill-equivalent stamping.
    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', 'A')]);
    // Scraper re-syncs the same week WITHOUT room info (sala null).
    await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);

    const parts = await repo.findPartsByWeek(id_week);
    expect(parts[0].sala).toBe('A');
  });

  it('upsertWeek overwrites sala when the sync explicitly provides one', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', 'A')]);
    await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', 'B')]);

    const parts = await repo.findPartsByWeek(id_week);
    expect(parts[0].sala).toBe('B');
  });
});

describe('TursoAssignmentsRepository.updatePartSala (direct UPDATE write path)', () => {
  function week(fecha: string, semana: string): MeetingWeek {
    return new MeetingWeek(0, semana, 'LMD', fecha, fecha, 'no_generada');
  }

  function part(orden: number, tipo: PresentationPart['tipo'], sala: PresentationPart['sala']): PresentationPart {
    return new PresentationPart(0, 0, orden, tipo, 'SEAMOS_MEJORES_MAESTROS', 5, null, new SourceRef('lmd'), sala);
  }

  async function salaOf(repo: TursoAssignmentsRepository, id_part: number): Promise<PresentationPart['sala']> {
    const part = await repo.findPartById(id_part);
    if (!part) throw new Error(`part ${id_part} not found in test harness`);
    return part.sala;
  }

  it('direct UPDATE sets A, then B, and clear writes NULL', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);
    const id_part = (await repo.findPartsByWeek(id_week))[0].id_part;

    await repo.updatePartSala(id_part, 'A');
    expect(await salaOf(repo, id_part)).toBe('A');

    await repo.updatePartSala(id_part, 'B');
    expect(await salaOf(repo, id_part)).toBe('B');

    await repo.updatePartSala(id_part, null);
    expect(await salaOf(repo, id_part)).toBeNull();
  });

  it('PIN: a direct-UPDATE clear to NULL is not resurrected by a scraper re-upsert', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    // Sync stamps 'A', user clears it to NULL via the write path.
    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', 'A')]);
    const id_part = (await repo.findPartsByWeek(id_week))[0].id_part;
    await repo.updatePartSala(id_part, null);
    expect(await salaOf(repo, id_part)).toBeNull();

    // Scraper re-syncs the same week without room info (incoming sala NULL).
    await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);

    // The explicit clear must win: COALESCE must not resurrect 'A'.
    expect(await salaOf(repo, id_part)).toBeNull();
  });

  it('COALESCE guard: a stamped sala survives a scraper re-upsert with incoming NULL', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', 'A')]);
    const id_part = (await repo.findPartsByWeek(id_week))[0].id_part;

    await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);

    expect(await salaOf(repo, id_part)).toBe('A');
  });
});

describe('TursoAssignmentsRepository.upsertWeek adoption-aware merge (sala mirror)', () => {
  function week(fecha: string, semana: string): MeetingWeek {
    return new MeetingWeek(0, semana, 'LMD', fecha, fecha, 'no_generada');
  }

  function part(orden: number, tipo: PresentationPart['tipo'], sala: PresentationPart['sala']): PresentationPart {
    return new PresentationPart(0, 0, orden, tipo, 'SEAMOS_MEJORES_MAESTROS', 5, null, new SourceRef('lmd'), sala);
  }

  async function countParts(client: DatabaseClient, where = ''): Promise<number> {
    const res = await client.execute(`SELECT COUNT(*) AS c FROM presentation_part ${where}`);
    return Number(res.rows[0].c);
  }

  it('R3-S1 GATE: re-syncing an adopted week (A original + B twin) with sala NULL posts no duplicates and leaves zero NULL-sala rows', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    // First scrape (no room info), then adoption: stamp the original 'A' and
    // clone a 'B' twin — the exact post-adoption state the use case produces.
    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);
    const original = (await repo.findPartsByWeek(id_week))[0].id_part;
    await client.execute({
      sql: `UPDATE presentation_part SET sala = 'A' WHERE id_part = ?`,
      args: [original],
    });
    await client.execute({
      sql: `INSERT INTO presentation_part
        (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto, sala)
        VALUES (?, 1, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, NULL, 'lmd', NULL, NULL, 'B')`,
      args: [id_week],
    });
    expect(await countParts(client)).toBe(2);

    // Scraper re-syncs the same week posting the same part with sala NULL.
    await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);

    // Spike A5 regression: a naive conflict target cannot see NULL-vs-stamped,
    // so a plain upsert would slip a NULL duplicate next to the 'A' original.
    expect(await countParts(client)).toBe(2);
    expect(await countParts(client, 'WHERE sala IS NULL')).toBe(0);
    const salas = await client.execute('SELECT sala FROM presentation_part ORDER BY sala');
    expect(salas.rows.map((r) => r.sala)).toEqual(['A', 'B']);
  });

  it('spike A2: the expression index lets a stamped A original and its B clone coexist for the same (tipo, orden)', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);
    const original = (await repo.findPartsByWeek(id_week))[0].id_part;
    await client.execute({
      sql: `UPDATE presentation_part SET sala = 'A' WHERE id_part = ?`,
      args: [original],
    });
    await client.execute({
      sql: `INSERT INTO presentation_part
        (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto, sala)
        VALUES (?, 1, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, NULL, 'lmd', NULL, NULL, 'B')`,
      args: [id_week],
    });

    expect(await countParts(client)).toBe(2);
    const twins = await client.execute({
      sql: 'SELECT sala FROM presentation_part WHERE id_week = ? ORDER BY sala',
      args: [id_week],
    });
    expect(twins.rows.map((r) => r.sala)).toEqual(['A', 'B']);
  });

  it('spike A4: the expression index blocks a second NULL-sala row for the same (tipo, orden)', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    // One scraped part with sala NULL already occupies the NULL slot.
    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);

    // A second NULL row for the same slot must be rejected by the index.
    await expect(
      client.execute({
        sql: `INSERT INTO presentation_part
          (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto, sala)
          VALUES (?, 1, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, NULL, 'lmd', NULL, NULL, NULL)`,
        args: [id_week],
      })
    ).rejects.toThrow(/UNIQUE constraint failed/);
  });

  it('merge refreshes metadata on both the stamped A original and the B twin without duplicating or erasing', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    // Adopted week: 'A' original + 'B' twin, duracion 5, fuente lmd sin punto.
    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', null)]);
    const original = (await repo.findPartsByWeek(id_week))[0].id_part;
    await client.execute({
      sql: `UPDATE presentation_part SET sala = 'A' WHERE id_part = ?`,
      args: [original],
    });
    await client.execute({
      sql: `INSERT INTO presentation_part
        (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto, sala)
        VALUES (?, 1, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, NULL, 'lmd', NULL, NULL, 'B')`,
      args: [id_week],
    });

    // The scraper re-publishes the part with updated metadata and no room info.
    const refreshed = new PresentationPart(
      0, id_week, 1, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 10, null,
      new SourceRef('lmd', 4, 'punto nuevo'), null
    );
    await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [refreshed]);

    const parts = await repo.findPartsByWeek(id_week);
    expect(parts).toHaveLength(2);
    for (const p of parts) {
      expect(p.duracion_min).toBe(10);
      expect(p.fuente.leccion).toBe(4);
      expect(p.fuente.punto).toBe('punto nuevo');
    }
    const salas = parts.map((p) => p.sala).sort();
    expect(salas).toEqual(['A', 'B']);
  });

  it('insertParts performs a plain INSERT next to the A original and lets the DB assign ids', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [part(1, 'discurso', 'A')]);
    const original = (await repo.findPartsByWeek(id_week))[0];

    // Adoption clone: same (tipo, orden), sala 'B', entity id 0 (DB assigns).
    await repo.insertParts([
      new PresentationPart(0, id_week, 1, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, null, new SourceRef('lmd'), 'B'),
    ]);

    const parts = await repo.findPartsByWeek(id_week);
    expect(parts).toHaveLength(2);
    const clone = parts.find((p) => p.sala === 'B');
    expect(clone).toBeDefined();
    expect(clone!.id_part).toBeGreaterThan(original.id_part);
    expect(clone!.orden).toBe(original.orden);
    expect(clone!.tipo).toBe(original.tipo);
  });

  it('bulkUpdatePartSala stamps several parts in one batch, including an explicit NULL clear', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [
      part(1, 'discurso', null),
      part(2, 'lectura_biblia', 'B'),
    ]);
    const [discurso, lectura] = await repo.findPartsByWeek(id_week);

    await repo.bulkUpdatePartSala([
      { id_part: discurso.id_part, sala: 'A' },
      { id_part: lectura.id_part, sala: null },
    ]);

    const after = await repo.findPartsByWeek(id_week);
    expect(after.find((p) => p.id_part === discurso.id_part)?.sala).toBe('A');
    // Explicit clear: null overwrites the previous 'B' (no COALESCE guard here).
    expect(after.find((p) => p.id_part === lectura.id_part)?.sala).toBeNull();
  });

  it('deletePartsByIds removes exactly the given rows in one batch; empty input is a no-op', async () => {
    const client = await freshClient();
    setDatabaseClient(client);
    const repo = new TursoAssignmentsRepository();

    const id_week = await repo.upsertWeek(week('2026-07-01', '2026/07/01'), [
      part(1, 'discurso', 'A'),
      part(2, 'lectura_biblia', 'B'),
    ]);
    const parts = await repo.findPartsByWeek(id_week);

    // Rebuild-policy surplus removal: drop the B row, keep the A original.
    await repo.deletePartsByIds([parts.find((p) => p.sala === 'B')!.id_part]);
    let after = await repo.findPartsByWeek(id_week);
    expect(after.map((p) => p.sala)).toEqual(['A']);

    // Empty batch must not touch the client.
    await repo.deletePartsByIds([]);
    after = await repo.findPartsByWeek(id_week);
    expect(after).toHaveLength(1);
  });
});