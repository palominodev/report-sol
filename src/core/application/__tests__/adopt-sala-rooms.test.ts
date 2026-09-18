import { describe, it, expect } from 'vitest';
import { AdoptSalaRoomsUseCase } from '../use-cases/presentation/AdoptSalaRoomsUseCase';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { Assignment } from '@/domain/entities/presentation/Assignment';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import type { PresentationType, Sala } from '@/domain/entities/presentation/enums';

/**
 * Stateful in-memory fake of the assignments port: the three adoption write
 * methods really mutate `parts` (so re-runs observe the post-adoption state)
 * and every write is recorded in `writes` for zero-write assertions.
 */
type FakeRepo = IAssignmentsRepository & {
  writes: string[];
  parts: PresentationPart[];
  assignments: Assignment[];
};

function makeRepo(week: MeetingWeek | null, parts: PresentationPart[], assignments: Assignment[] = []): FakeRepo {
  let nextId = Math.max(0, ...parts.map((p) => p.id_part)) + 1;
  const writes: string[] = [];
  const replace = (id: number, sala: Sala | null) => {
    const i = parts.findIndex((p) => p.id_part === id);
    const p = parts[i];
    parts[i] = new PresentationPart(p.id_part, p.id_week, p.orden, p.tipo, p.seccion, p.duracion_min, p.escenario, p.fuente, sala);
  };
  return {
    writes,
    parts,
    assignments,
    findWeekById: async () => week,
    findPartsByWeek: async () => [...parts],
    findAssignmentsByWeek: async () => [...assignments],
    bulkUpdatePartSala: async (updates: { id_part: number; sala: Sala | null }[]) => {
      writes.push(`stamp:${updates.map((u) => `${u.id_part}->${u.sala}`).sort().join(',')}`);
      for (const u of updates) replace(u.id_part, u.sala);
    },
    insertParts: async (rows: PresentationPart[]) => {
      writes.push(`insert:${rows.map((r) => `${r.tipo}|${r.orden}`).sort().join(',')}`);
      for (const r of rows) parts.push(new PresentationPart(nextId++, r.id_week, r.orden, r.tipo, r.seccion, r.duracion_min, r.escenario, r.fuente, r.sala));
    },
    deletePartsByIds: async (ids: number[]) => {
      writes.push(`delete:${[...ids].sort().join(',')}`);
      for (const id of ids) parts.splice(parts.findIndex((p) => p.id_part === id), 1);
    },
  } as unknown as FakeRepo;
}

function part(id: number, orden: number, sala: Sala | null, tipo: PresentationType = 'lectura_biblia'): PresentationPart {
  return new PresentationPart(id, 10, orden, tipo, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1), sala);
}

function manualAssignment(idPart: number): Assignment {
  return new Assignment(500 + idPart, idPart, 10, 77, 'presentador', 'manual');
}

const week = new MeetingWeek(10, '5-11 de octubre', '2026-10', '2026-10-05', '2026-10-11', 'no_generada');

describe('AdoptSalaRoomsUseCase', () => {
  it('R2-S1: legacy mixed week — NULL parts stamped A (manuals intact), every A gains B', async () => {
    // Oct 5-11 shape: scraped NULL parts, two with manual assignments, plus
    // one already-stamped lone-'A' group.
    const repo = makeRepo(week, [
      part(1, 1, null),
      part(2, 2, null),
      part(3, 3, null),
      part(4, 4, 'A'),
    ]);
    const manuals = [manualAssignment(2), manualAssignment(3)];
    repo.assignments.push(...manuals);

    const result = await new AdoptSalaRoomsUseCase(repo).execute({ id_week: 10, policy: 'adopt_and_clone' });

    expect(result).toEqual({ stamped: 3, cloned: 4, removedSurplus: 0 });

    // Every original NULL part is now 'A' — including the ones holding
    // manual assignments (stamping the part keeps its assignment rows).
    expect(repo.parts.filter((p) => p.sala === 'A' && p.id_part <= 4)).toHaveLength(4);

    // Manual rows are untouched by adoption.
    expect(repo.assignments).toEqual(manuals);

    // FULL MIRROR: 4 groups each gained a B twin (ids assigned by the fake).
    const clones = repo.parts.filter((p) => p.sala === 'B');
    expect(clones).toHaveLength(4);
    const cloneOf1 = clones.find((c) => c.orden === 1)!;
    expect(cloneOf1.tipo).toBe('lectura_biblia');
    expect(cloneOf1.duracion_min).toBe(4);
    expect(cloneOf1.fuente).toEqual(new SourceRef('lmd', 1));
    // Clones carry NO assignments — the generate step fills both rooms.
    expect(repo.assignments.some((a) => a.id_part === cloneOf1.id_part)).toBe(false);
  });

  it('R2-S2: adoption re-run is a zero-write no-op', async () => {
    const repo = makeRepo(week, [part(1, 1, null), part(2, 2, null)]);
    const uc = new AdoptSalaRoomsUseCase(repo);

    await uc.execute({ id_week: 10, policy: 'adopt_and_clone' });
    repo.writes.length = 0;

    const second = await uc.execute({ id_week: 10, policy: 'adopt_and_clone' });

    expect(second).toEqual({ stamped: 0, cloned: 0, removedSurplus: 0 });
    expect(repo.writes).toEqual([]);
    expect(repo.parts.filter((p) => p.sala === 'A')).toHaveLength(2);
    expect(repo.parts.filter((p) => p.sala === 'B')).toHaveLength(2);
  });

  it('rebuild normalizes: stamps NULL-only groups, removes surplus NULLs next to an A, mirrors', async () => {
    const repo = makeRepo(week, [
      part(1, 1, null), // NULL-only group → stamped + cloned
      part(2, 2, 'A'), // plain A group → cloned
      part(3, 3, 'A'), // A + garbage NULL twin → NULL deleted, cloned
      part(4, 3, null),
      part(5, 4, 'A'), // already mirrored → untouched
      part(6, 4, 'B'),
      part(7, 5, 'B'), // lone-'B' manual group → untouched
    ]);

    const result = await new AdoptSalaRoomsUseCase(repo).execute({ id_week: 10, policy: 'rebuild' });

    expect(result).toEqual({ stamped: 1, cloned: 3, removedSurplus: 1 });
    expect(repo.writes).toEqual(['delete:4', 'stamp:1->A', 'insert:lectura_biblia|1,lectura_biblia|2,lectura_biblia|3']);

    const salasByOrden = new Map<number, Sala[]>();
    for (const p of repo.parts) salasByOrden.set(p.orden, [...(salasByOrden.get(p.orden) ?? []), p.sala!].sort());
    expect(salasByOrden.get(1)).toEqual(['A', 'B']);
    expect(salasByOrden.get(2)).toEqual(['A', 'B']);
    expect(salasByOrden.get(3)).toEqual(['A', 'B']); // garbage NULL gone
    expect(salasByOrden.get(4)).toEqual(['A', 'B']);
    expect(salasByOrden.get(5)).toEqual(['B']); // lone-B preserved
  });

  it('rebuild rejects with ValidationError and performs NO writes when a surplus NULL carries assignments', async () => {
    const repo = makeRepo(week, [
      part(1, 1, 'A'),
      part(2, 1, null), // garbage twin WITH a manual assignment
      part(3, 2, null), // would be stamped — must not happen after the reject
    ]);
    repo.assignments.push(manualAssignment(2));

    await expect(new AdoptSalaRoomsUseCase(repo).execute({ id_week: 10, policy: 'rebuild' })).rejects.toThrow(
      ValidationError
    );
    expect(repo.writes).toEqual([]);
    expect(repo.parts).toHaveLength(3); // nothing stamped, deleted, or cloned
  });

  it('lone-B manual groups are untouched under BOTH policies', async () => {
    for (const policy of ['adopt_and_clone', 'rebuild'] as const) {
      const repo = makeRepo(week, [part(1, 1, 'B')]);
      const result = await new AdoptSalaRoomsUseCase(repo).execute({ id_week: 10, policy });
      expect(result).toEqual({ stamped: 0, cloned: 0, removedSurplus: 0 });
      expect(repo.writes).toEqual([]);
      expect(repo.parts).toEqual([part(1, 1, 'B')]);
    }
  });

  it('adopts a NULL row sitting next to a lone B by stamping it A (group becomes {A,B})', async () => {
    const repo = makeRepo(week, [part(1, 1, null), part(2, 1, 'B')]);

    const result = await new AdoptSalaRoomsUseCase(repo).execute({ id_week: 10, policy: 'adopt_and_clone' });

    expect(result).toEqual({ stamped: 1, cloned: 0, removedSurplus: 0 });
    expect(repo.writes).toEqual(['stamp:1->A']);
  });

  it('adopt leaves a NULL twin next to an existing A in place (garbage removal is rebuild-only)', async () => {
    const repo = makeRepo(week, [part(1, 1, 'A'), part(2, 1, null)]);

    const result = await new AdoptSalaRoomsUseCase(repo).execute({ id_week: 10, policy: 'adopt_and_clone' });

    // The A is mirrored, but the garbage NULL survives: stamping it would
    // collide with the unique index — only rebuild deletes it. (The clone is
    // appended, so its id is the highest of the three.)
    expect(result).toEqual({ stamped: 0, cloned: 1, removedSurplus: 0 });
    expect(repo.parts.filter((p) => p.orden === 1).map((p) => p.sala)).toEqual(['A', null, 'B']);
  });

  it('empty plan (week with no parts) is a success no-op with zero writes', async () => {
    const repo = makeRepo(week, []);
    const result = await new AdoptSalaRoomsUseCase(repo).execute({ id_week: 10, policy: 'adopt_and_clone' });
    expect(result).toEqual({ stamped: 0, cloned: 0, removedSurplus: 0 });
    expect(repo.writes).toEqual([]);
  });

  it('rejects an out-of-enum policy with ValidationError before any read or write', async () => {
    const repo = makeRepo(week, [part(1, 1, null)]);
    await expect(
      new AdoptSalaRoomsUseCase(repo).execute({ id_week: 10, policy: 'nope' as never })
    ).rejects.toThrow(ValidationError);
    expect(repo.writes).toEqual([]);
  });

  it('404 on an unknown week', async () => {
    const repo = makeRepo(null, []);
    await expect(new AdoptSalaRoomsUseCase(repo).execute({ id_week: 999, policy: 'rebuild' })).rejects.toThrow(
      NotFoundError
    );
  });
});
