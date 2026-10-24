import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { TursoAssignmentsRepository } from '@/infrastructure/persistence/turso-assignments.repository';
import { GetAssignmentHistoryUseCase } from '../use-cases/presentation/GetAssignmentHistoryUseCase';
import { GET } from '@/app/api/asignaciones/semana/[id]/historial/[assignmentId]/route';
import { signIn } from '@/app/api/__tests__/auth-helpers';

let client: ReturnType<typeof createClient>;
const repo = new TursoAssignmentsRepository();
const useCase = new GetAssignmentHistoryUseCase(repo);

async function add(idWeek: number, date: string, idUser: number, state: string, role = 'presentador', sala: string | null = 'A') {
  await client.execute({
    sql: `INSERT OR IGNORE INTO presentation_week (id_week, semana, issue, fecha_inicio, fecha_fin)
      VALUES (?, ?, 'test', ?, ?)`, args: [idWeek, `Semana ${date}`, date, date],
  });
  const part = await client.execute({
    sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente, sala)
      VALUES (?, ?, 'empiece_conversaciones', 'SEAMOS_MEJORES_MAESTROS', 3, 'lmd', ?) RETURNING id_part`,
    args: [idWeek, idUser, sala],
  });
  await client.execute({
    sql: `INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado) VALUES (?, ?, ?, ?, ?)`,
    args: [part.rows[0].id_part, idWeek, idUser, role, state],
  });
}

async function snapshot() {
  return Promise.all((await repo.listWeeks()).map(async week => ({
    week, parts: await repo.findPartsByWeek(week.id_week), assignments: await repo.findAssignmentsByWeek(week.id_week),
  })));
}

let cookie = '';

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('src/db.sql', 'utf8'));
  setDatabaseClient(client);
  cookie = (await signIn()).cookie;
  await client.execute(`INSERT INTO usuario (id_usuario, nombre, apellido) VALUES
    (1, 'Manual', 'Person'), (2, 'Confirmed', 'Person'), (3, 'Draft', 'Person'), (4, 'Never', 'Assigned'), (5, 'Old', 'History')`);
  await add(1, '2026-02-02', 5, 'confirmed', 'presentador', null);
  await add(2, '2026-09-07', 1, 'confirmed');
  await add(2, '2026-09-07', 2, 'confirmed');
  await add(3, '2026-09-21', 1, 'manual', 'companero', 'B');
  await add(4, '2026-10-12', 1, 'draft');
  await add(4, '2026-10-12', 3, 'draft');
  await add(5, '2026-10-19', 1, 'manual');
  await add(6, '2026-11-02', 1, 'confirmed');
});

afterEach(() => { setDatabaseClient(null); client.close(); });

describe('assignment history before a selected week', () => {
  it('returns every prior manual/confirmed assignment, newest first per person, without preloading details', async () => {
    const rows = await useCase.execute({ id_week: 5 });
    expect(rows).toEqual([
      { id_asignacion: 4, id_usuario: 1, id_week: 3, fecha_inicio: '2026-09-21', fecha_fin: '2026-09-21' },
      { id_asignacion: 2, id_usuario: 1, id_week: 2, fecha_inicio: '2026-09-07', fecha_fin: '2026-09-07' },
      { id_asignacion: 3, id_usuario: 2, id_week: 2, fecha_inicio: '2026-09-07', fecha_fin: '2026-09-07' },
      { id_asignacion: 1, id_usuario: 5, id_week: 1, fecha_inicio: '2026-02-02', fecha_fin: '2026-02-02' },
    ]);
  });

  it('excludes draft-only people and people with no registered history', async () => {
    const rows = await useCase.execute({ id_week: 5 });
    expect(rows.map(row => row.id_usuario)).not.toContain(3);
    expect(rows.map(row => row.id_usuario)).not.toContain(4);
  });

  it('uses the selected week as the boundary, excluding that week and future assignments', async () => {
    const rows = await useCase.execute({ id_week: 3 });
    expect(rows.find(row => row.id_usuario === 1)?.id_week).toBe(2);
  });

  it('includes history older than 26 weeks without a list limit', async () => {
    const rows = await useCase.execute({ id_week: 5 });
    expect(rows.find(row => row.id_usuario === 5)).toMatchObject({ fecha_inicio: '2026-02-02' });
  });

  it('loads one assignment detail through the public GET endpoint', async () => {
    const before = await snapshot();
    const response = await GET(new Request('http://localhost/api/asignaciones/semana/5/historial/4', { headers: { cookie } }), {
      params: Promise.resolve({ id: '5', assignmentId: '4' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id_asignacion: 4, id_usuario: 1, id_week: 3, fecha_inicio: '2026-09-21', fecha_fin: '2026-09-21',
      tipo: 'empiece_conversaciones', rol: 'companero', sala: 'B',
    });
    expect(await snapshot()).toEqual(before);
  });

  it('returns 404 for a missing reference week without changing data', async () => {
    const before = await snapshot();
    const response = await GET(new Request('http://localhost/', { headers: { cookie } }), { params: Promise.resolve({ id: '999', assignmentId: '4' }) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Semana 999 no encontrada' });
    expect(await snapshot()).toEqual(before);
  });

  it('returns a failed detail response without modifying data', async () => {
    const before = await snapshot();
    const query = vi.spyOn(TursoAssignmentsRepository.prototype, 'findAssignmentHistoryDetail').mockRejectedValueOnce(new Error('History unavailable'));
    try {
      const response = await GET(new Request('http://localhost/', { headers: { cookie } }), { params: Promise.resolve({ id: '5', assignmentId: '4' }) });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'History unavailable' });
      expect(await snapshot()).toEqual(before);
    } finally {
      query.mockRestore();
    }
  });

  it('preserves unknown rooms in the loaded detail', async () => {
    expect(await useCase.getDetail({ id_week: 5, id_asignacion: 1 })).toMatchObject({ sala: null });
  });

  it.each(['5', '7', '8', '999'])('does not expose draft, current, future or missing detail %s', async assignmentId => {
    const before = await snapshot();
    const response = await GET(new Request('http://localhost/', { headers: { cookie } }), { params: Promise.resolve({ id: '5', assignmentId }) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Asignación histórica no encontrada' });
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    { id: '0', assignmentId: '4', error: 'Semana inválida' },
    { id: '5', assignmentId: 'NaN', error: 'Asignación inválida' },
    { id: '5', assignmentId: '-1', error: 'Asignación inválida' },
    { id: '5', assignmentId: '1.5', error: 'Asignación inválida' },
    { id: '5', assignmentId: '9007199254740992', error: 'Asignación inválida' },
  ])('rejects malformed detail identifiers without modifying data: $id/$assignmentId', async ({ id, assignmentId, error }) => {
    const before = await snapshot();
    const response = await GET(new Request('http://localhost/', { headers: { cookie } }), { params: Promise.resolve({ id, assignmentId }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
    expect(await snapshot()).toEqual(before);
  });

  it('is read-only and leaves existing week, part and assignment behavior intact', async () => {
    const before = await snapshot();
    await useCase.execute({ id_week: 5 });
    expect(await snapshot()).toEqual(before);
  });

  it('rejects an unknown week without changing stored assignments', async () => {
    const before = await snapshot();
    await expect(useCase.execute({ id_week: 999 })).rejects.toThrow('Semana 999 no encontrada');
    expect(await snapshot()).toEqual(before);
  });
});
