import { describe, expect, it } from 'vitest';
import { CreateInformeUseCase } from '../use-cases/CreateInformeUseCase';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import type { IInformeRepository, InformeCreateData } from '@/core/domain/repositories/IInformeRepository';

const NOW = new Date('2026-10-24T12:00:00.000Z');

const valid: InformeCreateData = {
  horas: 5,
  cursos: 1,
  año: 2026,
  mes: 'SEP',
  participacion: true,
  id_usuario: 1,
  trabajo_como_auxiliar: false,
  notas: null,
};

function setup() {
  const created: InformeCreateData[] = [];
  const repository = {
    async create(data: InformeCreateData) {
      created.push(data);
      return { id_informe: 1, fecha_registro: 'now', ...data } as never;
    },
  } as unknown as IInformeRepository;
  return { created, useCase: new CreateInformeUseCase(repository, () => NOW) };
}

async function rejects(patch: Record<string, unknown>) {
  const { created, useCase } = setup();
  await expect(useCase.execute({ ...valid, ...patch } as InformeCreateData)).rejects.toBeInstanceOf(ValidationError);
  expect(created).toHaveLength(0);
}

describe('CreateInformeUseCase: what a public report may contain', () => {
  it('still stores a normal report and upper-cases the month (previous behaviour)', async () => {
    const { created, useCase } = setup();

    await useCase.execute({ ...valid, mes: 'sep' });

    expect(created).toEqual([{ ...valid, mes: 'SEP' }]);
  });

  it('still accepts null hours, as before', async () => {
    const { created, useCase } = setup();
    await useCase.execute({ ...valid, horas: null });
    expect(created).toHaveLength(1);
  });

  it('accepts the current month, the previous year and the maximum values', async () => {
    const { created, useCase } = setup();

    await useCase.execute({ ...valid, mes: 'OCT' });
    await useCase.execute({ ...valid, año: 2025, mes: 'DIC' });
    await useCase.execute({ ...valid, horas: 744, cursos: 200, notas: 'n'.repeat(1000) });

    expect(created).toHaveLength(3);
  });

  it.each([9999, 1e308, 1900, 2019, 2027, 2026.5, -5, Number.NaN])('rejects the year %s and stores nothing', async (año) => {
    await rejects({ año });
  });

  it.each(['NOV', 'DIC'])('rejects a month that has not happened yet in the current year (%s)', async (mes) => {
    await rejects({ mes });
  });

  it.each([-1, 745, 1e9, -1e9, Number.POSITIVE_INFINITY, Number.NaN])('rejects hours = %s', async (horas) => {
    await rejects({ horas });
  });

  it.each([-1, 201, 1e15, 1.5, Number.NaN])('rejects courses = %s', async (cursos) => {
    await rejects({ cursos });
  });

  it('rejects notes longer than 1000 characters, or that are not text', async () => {
    await rejects({ notas: 'n'.repeat(1001) });
    await rejects({ notas: { a: 1 } });
    await rejects({ notas: 5 });
  });

  it('rejects a user id that is not a positive whole number', async () => {
    await rejects({ id_usuario: 0 });
    await rejects({ id_usuario: -3 });
    await rejects({ id_usuario: 1.5 });
  });

  it('keeps the existing required-field errors', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({ ...valid, cursos: undefined } as never)).rejects.toThrow(/cursos/);
    await expect(useCase.execute({ ...valid, mes: 'XXX' })).rejects.toThrow(/mes/);
    await expect(useCase.execute({ ...valid, participacion: 'si' } as never)).rejects.toThrow(/participacion/);
  });
});
