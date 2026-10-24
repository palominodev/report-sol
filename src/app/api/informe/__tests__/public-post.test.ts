import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { POST } from '../route';

let client: ReturnType<typeof createClient>;

const body = (patch: Record<string, unknown> = {}) => ({
  horas: 5,
  cursos: 1,
  año: new Date().getFullYear(),
  mes: 'ENE',
  participacion: true,
  id_usuario: 1,
  trabajo_como_auxiliar: false,
  notas: null,
  ...patch,
});

function post(payload: unknown, raw = false) {
  return POST(
    new NextRequest('http://localhost/api/informe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw ? (payload as string) : JSON.stringify(payload),
    })
  );
}

const rows = async () => Number((await client.execute('SELECT COUNT(*) AS n FROM informe')).rows[0].n);

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('src/db.sql', 'utf8'));
  setDatabaseClient(client);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await client.execute("INSERT INTO usuario (nombre, apellido, genero) VALUES ('Test', 'Person', 'masculino')");
});

afterEach(() => {
  setDatabaseClient(null);
  client.close();
  vi.restoreAllMocks();
});

describe('POST /api/informe without any session (public, S7)', () => {
  it('stores a valid report and answers 201', async () => {
    const response = await post(body());

    expect(response.status).toBe(201);
    expect(await rows()).toBe(1);
  });

  it('refuses a second report for the same publisher and month with 400 and keeps the first one', async () => {
    await post(body({ horas: 5 }));

    const response = await post(body({ horas: 99 }));

    expect(response.status).toBe(400);
    expect((await client.execute('SELECT horas FROM informe')).rows.map((r) => Number(r.horas))).toEqual([5]);
  });

  it('ignores columns the caller should not control (id_informe, fecha_registro)', async () => {
    await post(body({ id_informe: 777, fecha_registro: '1999-01-01 00:00:00' }));

    const row = (await client.execute('SELECT id_informe, fecha_registro FROM informe')).rows[0];
    expect(Number(row.id_informe)).not.toBe(777);
    expect(String(row.fecha_registro)).not.toContain('1999');
  });

  it.each([
    ['year 9999', { año: 9999 }],
    ['absurd hours', { horas: -1e9 }],
    ['absurd courses', { cursos: 1e15 }],
    ['a huge note', { notas: 'x'.repeat(1_000_000) }],
  ])('rejects %s with 400 and stores nothing', async (_label, patch) => {
    const response = await post(body(patch));

    expect(response.status).toBe(400);
    expect(await rows()).toBe(0);
  });

  it('answers 400, not 500, to a body that is not JSON, or JSON null', async () => {
    expect((await post('{not json', true)).status).toBe(400);
    expect((await post('null', true)).status).toBe(400);
    expect((await post('[]', true)).status).toBe(400);
    expect(await rows()).toBe(0);
  });

  it('answers 400 for a publisher that does not exist, without leaking internals', async () => {
    const response = await post(body({ id_usuario: 999 }));

    expect(response.status).toBe(400);
    const text = JSON.stringify(await response.json());
    expect(text).not.toMatch(/FOREIGN|constraint|SQLITE|sql/i);
    expect(await rows()).toBe(0);
  });

  it('four simultaneous identical reports leave exactly one row and answer 400 to the rest, never 500', async () => {
    const responses = await Promise.all([post(body()), post(body()), post(body()), post(body())]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 400, 400, 400]);
    expect(await rows()).toBe(1);
  });
});
