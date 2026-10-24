import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { TursoAssignmentsRepository } from '@/infrastructure/persistence/turso-assignments.repository';
import { signIn } from '../../../../../__tests__/auth-helpers';
import { DELETE } from '../route';

let client: ReturnType<typeof createClient>;
let sessionCookie: string;
const repo = new TursoAssignmentsRepository();

async function snapshot() {
  const weeks = await repo.listWeeks();
  return Promise.all(weeks.map(async (week) => ({
    week,
    parts: await repo.findPartsByWeek(week.id_week),
    assignments: await repo.findAssignmentsByWeek(week.id_week),
  })));
}

async function discard(id = '1') {
  return DELETE(new Request(`http://localhost/api/asignaciones/semana/${id}/descartar`, {
    method: 'DELETE',
    headers: { cookie: sessionCookie },
  }), { params: Promise.resolve({ id }) });
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('src/db.sql', 'utf8'));
  setDatabaseClient(client);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  sessionCookie = (await signIn()).cookie;
  await client.execute("INSERT INTO usuario (nombre, apellido, genero) VALUES ('Test', 'Person', 'masculino')");
  for (const id of [1, 2]) {
    await client.execute({
      sql: `INSERT INTO presentation_week (id_week, semana, issue, fecha_inicio, fecha_fin, estado)
        VALUES (?, ?, 'test', '2026-10-19', '2026-10-25', 'confirmada')`,
      args: [id, `Week ${id}`],
    });
    for (const [index, estado] of ['draft', 'manual', 'confirmed'].entries()) {
      await client.execute({
        sql: `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente, sala)
          VALUES (?, ?, 'lectura_biblia', 'TESOROS_DE_LA_BIBLIA', 4, 'bib', ?)`,
        args: [id, index + 1, index === 1 ? 'B' : 'A'],
      });
      await client.execute({
        sql: `INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado)
          VALUES (?, ?, 1, 'presentador', ?)`,
        args: [(id - 1) * 3 + index + 1, id, estado],
      });
    }
  }
});

afterEach(() => {
  setDatabaseClient(null);
  client.close();
  vi.restoreAllMocks();
});

describe('DELETE weekly assignments', () => {
  it('discards all assignment states for only the selected week and preserves parts and rooms', async () => {
    const before = await snapshot();
    const response = await discard();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ discarded: 3 });
    const after = await snapshot();
    expect(after[0]).toEqual({ ...before[0], week: { ...before[0].week, estado: 'no_generada' }, assignments: [] });
    expect(after[1]).toEqual(before[1]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('is safe to repeat on an already empty week', async () => {
    await discard();
    const before = await snapshot();
    const response = await discard();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ discarded: 0 });
    expect(await snapshot()).toEqual(before);
  });

  it.each(['0', '-1', '1.5', 'NaN', '9007199254740992', '1 OR 1=1'])('rejects invalid week %s without modifying data', async (id) => {
    const before = await snapshot();
    const response = await discard(id);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Semana inválida' });
    expect(await snapshot()).toEqual(before);
  });

  it('returns 404 for an unknown week without modifying any week', async () => {
    const before = await snapshot();
    const response = await discard('99');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Semana 99 no encontrada' });
    expect(await snapshot()).toEqual(before);
  });

  it('rolls back deletion if resetting the week fails', async () => {
    await client.execute(`CREATE TRIGGER reject_reset BEFORE UPDATE OF estado ON presentation_week
      WHEN NEW.id_week = 1 AND NEW.estado = 'no_generada'
      BEGIN SELECT RAISE(ABORT, 'reset failed'); END`);
    const before = await snapshot();
    const response = await discard();
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBeTruthy();
    expect(await snapshot()).toEqual(before);
  });
});
