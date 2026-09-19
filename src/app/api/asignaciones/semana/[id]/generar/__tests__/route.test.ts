import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';

/**
 * Route-level tests of the generar contract: body strict-parsing (sala-route
 * precedent), the missing-policy 400, and the adopt-before-generate sequence.
 * The DI module is mocked; call ORDER is recorded to assert sequencing.
 */
const state = vi.hoisted(() => ({
  order: [] as string[],
  parts: [] as { sala: string | null }[],
  weekExists: true,
}));

vi.mock('@/infrastructure/config/di', () => ({
  getGetWeekAssignmentsUseCase: () => ({
    execute: async () => {
      state.order.push('get');
      if (!state.weekExists) throw new NotFoundError('Semana 1 no encontrada');
      return { week: { id_week: 1 }, parts: state.parts, assignments: [] };
    },
  }),
  getAdoptSalaRoomsUseCase: () => ({
    execute: async () => {
      state.order.push('adopt');
      return { stamped: 2, cloned: 2, removedSurplus: 0 };
    },
  }),
  getGenerateWeekAssignmentsUseCase: () => ({
    execute: async () => {
      state.order.push('generate');
      return { assignments: [], unassigned: [] };
    },
  }),
}));

function post(body?: string): Request {
  return new Request('http://localhost/api/asignaciones/semana/1/generar', {
    method: 'POST',
    body,
  });
}

async function call(body?: string): Promise<Response> {
  return POST(post(body), { params: Promise.resolve({ id: '1' }) });
}

describe('POST /api/asignaciones/semana/[id]/generar — salaPolicy contract', () => {
  beforeEach(() => {
    state.order.length = 0;
    state.parts = [];
    state.weekExists = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('malformed JSON body → 400 and no use case runs', async () => {
    const res = await call('no-es-json{');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('JSON');
    expect(state.order).toEqual([]);
  });

  it('R6-S3: non-enum salaPolicy → 400 and no use case runs', async () => {
    const res = await call('{"salaPolicy":"nope"}');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('salaPolicy');
    expect(state.order).toEqual([]);
  });

  it('NULL-sala parts present and no policy → 400 after the read, before adopt/generate', async () => {
    state.parts = [{ sala: 'A' }, { sala: null }];
    const res = await call();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('sin sala asignada');
    expect(state.order).toEqual(['get']);
  });

  it('happy path: policy runs adopt BEFORE generate and the response carries the adoption summary', async () => {
    state.parts = [{ sala: null }, { sala: null }];
    const res = await call('{"salaPolicy":"adopt_and_clone"}');

    expect(res.status).toBe(200);
    expect(state.order).toEqual(['get', 'adopt', 'generate']);
    const data = await res.json();
    expect(data.adoption).toEqual({ stamped: 2, cloned: 2, removedSurplus: 0 });
    expect(Array.isArray(data.assignments)).toBe(true);
  });

  it('no NULL-sala parts and no policy → direct generate 200 without adoption key', async () => {
    state.parts = [{ sala: 'A' }, { sala: 'B' }];
    const res = await call();

    expect(res.status).toBe(200);
    expect(state.order).toEqual(['get', 'generate']);
    const data = await res.json();
    expect('adoption' in data).toBe(false);
  });

  it('unknown week → 404 passthrough from the read use case', async () => {
    state.weekExists = false;
    const res = await call('{"salaPolicy":"rebuild"}');
    expect(res.status).toBe(404);
    expect(state.order).toEqual(['get']);
  });
});
