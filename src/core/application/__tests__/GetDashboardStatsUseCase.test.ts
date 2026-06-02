import { describe, it, expect, vi } from 'vitest';
import { GetDashboardStatsUseCase } from '../use-cases/GetDashboardStatsUseCase';
import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';
import { ExportableInformeRow } from '@/core/domain/PublisherStats';

function createRow(
  overrides: Partial<Record<keyof ExportableInformeRow, unknown>> = {}
): ExportableInformeRow {
  return {
    id_informe: 1,
    fecha_registro: '2026-01-01',
    horas: 10,
    cursos: 1,
    año: 2026,
    participacion: true,
    trabajo_como_auxiliar: false,
    mes: 'ENE',
    id_usuario: 1,
    notas: null,
    nombre: 'Test',
    apellido: 'User',
    grupo_nombre: 'Grupo 1',
    roles: 'publicador',
    ...overrides,
  } as ExportableInformeRow;
}

function createMockRepository(
  currentYear: number,
  currentRows: ExportableInformeRow[],
  previousRows: ExportableInformeRow[] = []
): IInformeRepository {
  return {
    findAllWithUsersFilter: vi.fn(async (año) => {
      return año === currentYear ? currentRows : previousRows;
    }),
    findByUsuarioId: vi.fn(),
    findRolesByUsuarioId: vi.fn(),
    findUserWithGroupById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findAllWithUsers: vi.fn(),
  } as unknown as IInformeRepository;
}

describe('GetDashboardStatsUseCase', () => {
  describe('aggregation logic', () => {
    it('should aggregate multiple rows, users, months, and groups correctly', async () => {
      const currentRows = [
        createRow({ id_usuario: 1, mes: 'ENE', horas: 10, cursos: 1, grupo_nombre: 'Grupo 1', roles: 'regular' }),
        createRow({ id_usuario: 1, mes: 'FEB', horas: 15, cursos: 2, grupo_nombre: 'Grupo 1', roles: 'regular' }),
        createRow({ id_usuario: 2, mes: 'ENE', horas: 5, cursos: 0, grupo_nombre: 'Grupo 1', roles: 'auxiliar' }),
        createRow({ id_usuario: 2, mes: 'MAR', horas: 8, cursos: 1, grupo_nombre: 'Grupo 2', roles: 'auxiliar', participacion: false }),
        createRow({ id_usuario: 3, mes: 'FEB', horas: 0, cursos: 0, grupo_nombre: 'Grupo 2', roles: 'publicador' }),
      ];

      const repo = createMockRepository(2026, currentRows);
      const useCase = new GetDashboardStatsUseCase(repo);
      const result = await useCase.execute({ año: 2026 });

      // KPIs
      const totalHorasKpi = result.kpis.find((k) => k.label === 'Total Horas')!;
      const totalCursosKpi = result.kpis.find((k) => k.label === 'Total Cursos')!;
      const participationKpi = result.kpis.find((k) => k.label === 'Tasa de Participación')!;
      const activePubsKpi = result.kpis.find((k) => k.label === 'Publicadores Activos')!;

      expect(totalHorasKpi.valor).toBe(38);
      expect(totalCursosKpi.valor).toBe(4);
      expect(participationKpi.valor).toBe(100);
      expect(activePubsKpi.valor).toBe(3);

      // Monthly trends ordered chronologically
      expect(result.monthlyTrends).toHaveLength(3);
      expect(result.monthlyTrends[0]).toEqual({ mes: 'ENE', horas: 15, cursos: 1 });
      expect(result.monthlyTrends[1]).toEqual({ mes: 'FEB', horas: 15, cursos: 2 });
      expect(result.monthlyTrends[2]).toEqual({ mes: 'MAR', horas: 8, cursos: 1 });

      // Group comparisons sorted by hours descending
      expect(result.groupComparisons).toHaveLength(2);
      expect(result.groupComparisons[0]).toMatchObject({
        grupo: 'Grupo 1',
        horas: 30,
        cursos: 3,
        porcentajeParticipacion: 100,
      });
      expect(result.groupComparisons[1]).toMatchObject({
        grupo: 'Grupo 2',
        horas: 8,
        cursos: 1,
        porcentajeParticipacion: 50,
      });

      // Participation breakdown
      expect(result.participationBreakdown).toHaveLength(3);
      expect(result.participationBreakdown.find((p) => p.tipo === 'regular')!.cantidad).toBe(1);
      expect(result.participationBreakdown.find((p) => p.tipo === 'auxiliar')!.cantidad).toBe(1);
      expect(result.participationBreakdown.find((p) => p.tipo === 'mixto')!.cantidad).toBe(1);
    });

    it('should return all zeros and empty arrays for empty input', async () => {
      const repo = createMockRepository(2026, [], []);
      const useCase = new GetDashboardStatsUseCase(repo);
      const result = await useCase.execute({ año: 2026 });

      expect(result.kpis.find((k) => k.label === 'Total Horas')!.valor).toBe(0);
      expect(result.kpis.find((k) => k.label === 'Total Cursos')!.valor).toBe(0);
      expect(result.kpis.find((k) => k.label === 'Tasa de Participación')!.valor).toBe(0);
      expect(result.kpis.find((k) => k.label === 'Publicadores Activos')!.valor).toBe(0);

      result.kpis.forEach((kpi) => {
        expect(kpi.tendencia).toBe('no-data');
        expect(kpi.valorPrevio).toBe(0);
      });

      expect(result.monthlyTrends).toEqual([]);
      expect(result.groupComparisons).toEqual([]);
      expect(result.participationBreakdown.every((p) => p.cantidad === 0 && p.porcentaje === 0)).toBe(true);
    });

    it('should correctly aggregate a single row', async () => {
      const row = createRow({ horas: 5, cursos: 2, roles: 'regular' });
      const repo = createMockRepository(2026, [row]);
      const useCase = new GetDashboardStatsUseCase(repo);
      const result = await useCase.execute({ año: 2026 });

      expect(result.kpis.find((k) => k.label === 'Total Horas')!.valor).toBe(5);
      expect(result.kpis.find((k) => k.label === 'Total Cursos')!.valor).toBe(2);
      expect(result.monthlyTrends).toEqual([{ mes: 'ENE', horas: 5, cursos: 2 }]);
      expect(result.groupComparisons).toHaveLength(1);
      expect(result.groupComparisons[0].porcentajeParticipacion).toBe(100);
      expect(result.participationBreakdown.find((p) => p.tipo === 'regular')!.cantidad).toBe(1);
    });

    it('should handle all-zero horas and cursos correctly', async () => {
      const current = [createRow({ horas: 0, cursos: 0, participacion: true })];
      const previous = [createRow({ horas: 0, cursos: 0, participacion: true, año: 2025 })];
      const repo = createMockRepository(2026, current, previous);
      const useCase = new GetDashboardStatsUseCase(repo);
      const result = await useCase.execute({ año: 2026 });

      expect(result.kpis.find((k) => k.label === 'Total Horas')!.valor).toBe(0);
      expect(result.kpis.find((k) => k.label === 'Total Horas')!.tendencia).toBe('no-data');
      expect(result.kpis.find((k) => k.label === 'Total Cursos')!.valor).toBe(0);
      expect(result.kpis.find((k) => k.label === 'Total Cursos')!.tendencia).toBe('no-data');
      expect(result.kpis.find((k) => k.label === 'Tasa de Participación')!.valor).toBe(100);
      expect(result.kpis.find((k) => k.label === 'Tasa de Participación')!.tendencia).toBe('stable');
      expect(result.kpis.find((k) => k.label === 'Publicadores Activos')!.valor).toBe(1);
      expect(result.kpis.find((k) => k.label === 'Publicadores Activos')!.tendencia).toBe('stable');
    });

    it('should default null grupo_nombre to "Sin grupo" in group comparisons', async () => {
      const row = createRow({ grupo_nombre: null as unknown as string });
      const repo = createMockRepository(2026, [row]);
      const useCase = new GetDashboardStatsUseCase(repo);
      const result = await useCase.execute({ año: 2026 });

      expect(result.groupComparisons).toHaveLength(1);
      expect(result.groupComparisons[0].grupo).toBe('Sin grupo');
    });
  });

  describe('filter passing', () => {
    it('should pass año only to repository', async () => {
      const repo = createMockRepository(2026, [createRow()]);
      const useCase = new GetDashboardStatsUseCase(repo);
      await useCase.execute({ año: 2026 });

      expect(repo.findAllWithUsersFilter).toHaveBeenCalledTimes(2);
      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2026, null, null, null);
      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2025, null, null, null);
    });

    it('should pass año + mes to repository', async () => {
      const repo = createMockRepository(2026, [createRow()]);
      const useCase = new GetDashboardStatsUseCase(repo);
      await useCase.execute({ año: 2026, mes: 'ENE' });

      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2026, 'ENE', null, null);
      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2025, 'ENE', null, null);
    });

    it('should pass año + rol to repository', async () => {
      const repo = createMockRepository(2026, [createRow()]);
      const useCase = new GetDashboardStatsUseCase(repo);
      await useCase.execute({ año: 2026, rol: 'publicador' });

      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2026, null, 'publicador', null);
      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2025, null, 'publicador', null);
    });

    it('should pass año + grupo to repository', async () => {
      const repo = createMockRepository(2026, [createRow()]);
      const useCase = new GetDashboardStatsUseCase(repo);
      await useCase.execute({ año: 2026, grupo: 1 });

      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2026, null, null, 1);
      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2025, null, null, 1);
    });

    it('should pass all filters combined to repository', async () => {
      const repo = createMockRepository(2026, [createRow()]);
      const useCase = new GetDashboardStatsUseCase(repo);
      await useCase.execute({ año: 2026, mes: 'ENE', rol: 'publicador', grupo: 1 });

      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2026, 'ENE', 'publicador', 1);
      expect(repo.findAllWithUsersFilter).toHaveBeenCalledWith(2025, 'ENE', 'publicador', 1);
    });
  });

  describe('trend calculation', () => {
    it('should report "up" when current year exceeds previous year', async () => {
      const currentRows = [
        createRow({ id_usuario: 1, horas: 10, cursos: 1, participacion: true }),
        createRow({ id_usuario: 2, horas: 10, cursos: 1, participacion: true }),
      ];
      const previousRows = [
        createRow({ id_usuario: 1, horas: 5, cursos: 0, participacion: true }),
      ];

      const repo = createMockRepository(2026, currentRows, previousRows);
      const useCase = new GetDashboardStatsUseCase(repo);
      const result = await useCase.execute({ año: 2026 });

      expect(result.kpis.find((k) => k.label === 'Total Horas')!.tendencia).toBe('up');
      expect(result.kpis.find((k) => k.label === 'Total Cursos')!.tendencia).toBe('up');
      expect(result.kpis.find((k) => k.label === 'Publicadores Activos')!.tendencia).toBe('up');
    });

    it('should report "down" when current year is below previous year', async () => {
      const currentRows = [
        createRow({ id_usuario: 1, horas: 5, cursos: 0, participacion: true }),
      ];
      const previousRows = [
        createRow({ id_usuario: 1, horas: 10, cursos: 2, participacion: true }),
        createRow({ id_usuario: 2, horas: 10, cursos: 2, participacion: true }),
      ];

      const repo = createMockRepository(2026, currentRows, previousRows);
      const useCase = new GetDashboardStatsUseCase(repo);
      const result = await useCase.execute({ año: 2026 });

      expect(result.kpis.find((k) => k.label === 'Total Horas')!.tendencia).toBe('down');
      expect(result.kpis.find((k) => k.label === 'Total Cursos')!.tendencia).toBe('down');
      expect(result.kpis.find((k) => k.label === 'Publicadores Activos')!.tendencia).toBe('down');
    });

    it('should report "stable" for identical current and previous values', async () => {
      const rows = [createRow({ id_usuario: 1, horas: 10, cursos: 1, participacion: true })];
      const repo = createMockRepository(2026, rows, rows);
      const useCase = new GetDashboardStatsUseCase(repo);
      const result = await useCase.execute({ año: 2026 });

      expect(result.kpis.find((k) => k.label === 'Total Horas')!.tendencia).toBe('stable');
      expect(result.kpis.find((k) => k.label === 'Total Cursos')!.tendencia).toBe('stable');
      expect(result.kpis.find((k) => k.label === 'Tasa de Participación')!.tendencia).toBe('stable');
      expect(result.kpis.find((k) => k.label === 'Publicadores Activos')!.tendencia).toBe('stable');
    });
  });
});
