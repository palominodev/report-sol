import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';
import { ExportableInformeRow, Mes } from '@/core/domain/PublisherStats';
import {
  DashboardStats,
  DashboardFilters,
  KpiData,
  MonthlyTrend,
  GroupComparison,
  ParticipationBreakdown,
} from '@/core/domain/dashboard/DashboardStats';

/** Maps month abbreviations to numeric order (1-12) */
const MES_ORDER: Record<Mes, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

export class GetDashboardStatsUseCase {
  constructor(private readonly informeRepository: IInformeRepository) {}

  async execute(filters: DashboardFilters): Promise<DashboardStats> {
    const año = filters.año ?? new Date().getFullYear();
    const mes = filters.mes ?? null;
    const rol = filters.rol ?? null;
    const grupo = filters.grupo ?? null;

    // Fetch current period and previous period (same filters, previous year)
    // for year-over-year KPI trend comparison
    const [currentRows, previousRows] = await Promise.all([
      this.informeRepository.findAllWithUsersFilter(año, mes, rol, grupo),
      this.informeRepository.findAllWithUsersFilter(año - 1, mes, rol, grupo),
    ]);

    const kpis = this.calculateKpis(currentRows, previousRows);
    const monthlyTrends = this.calculateMonthlyTrends(currentRows);
    const groupComparisons = this.calculateGroupComparisons(currentRows);
    const participationBreakdown = this.calculateParticipationBreakdown(currentRows);

    return {
      kpis,
      monthlyTrends,
      groupComparisons,
      participationBreakdown,
    };
  }

  /**
   * Calculates KPIs by comparing current period vs previous period.
   */
  private calculateKpis(
    current: ExportableInformeRow[],
    previous: ExportableInformeRow[]
  ): KpiData[] {
    const currentTotalHoras = current.reduce((sum, r) => sum + (r.horas ?? 0), 0);
    const previousTotalHoras = previous.reduce((sum, r) => sum + (r.horas ?? 0), 0);

    const currentTotalCursos = current.reduce((sum, r) => sum + r.cursos, 0);
    const previousTotalCursos = previous.reduce((sum, r) => sum + r.cursos, 0);

    const currentUniqueUsers = new Set(current.map((r) => r.id_usuario));
    const currentActiveUsers = new Set(
      current.filter((r) => r.participacion).map((r) => r.id_usuario)
    );

    const previousUniqueUsers = new Set(previous.map((r) => r.id_usuario));
    const previousActiveUsers = new Set(
      previous.filter((r) => r.participacion).map((r) => r.id_usuario)
    );

    const currentParticipationRate =
      currentUniqueUsers.size > 0
        ? (currentActiveUsers.size / currentUniqueUsers.size) * 100
        : 0;
    const previousParticipationRate =
      previousUniqueUsers.size > 0
        ? (previousActiveUsers.size / previousUniqueUsers.size) * 100
        : 0;

    return [
      {
        label: 'Total Horas',
        valor: currentTotalHoras,
        unidad: 'h',
        tendencia: this.determineTrend(currentTotalHoras, previousTotalHoras),
        valorPrevio: previousTotalHoras,
      },
      {
        label: 'Total Cursos',
        valor: currentTotalCursos,
        unidad: 'cursos',
        tendencia: this.determineTrend(currentTotalCursos, previousTotalCursos),
        valorPrevio: previousTotalCursos,
      },
      {
        label: 'Tasa de Participación',
        valor: Math.round(currentParticipationRate * 10) / 10,
        unidad: '%',
        tendencia: this.determineTrend(
          currentParticipationRate,
          previousParticipationRate
        ),
        valorPrevio: Math.round(previousParticipationRate * 10) / 10,
      },
      {
        label: 'Publicadores Activos',
        valor: currentActiveUsers.size,
        unidad: 'pubs',
        tendencia: this.determineTrend(
          currentActiveUsers.size,
          previousActiveUsers.size
        ),
        valorPrevio: previousActiveUsers.size,
      },
    ];
  }

  /**
   * Determines trend direction by comparing current vs previous value.
   * Uses a 1% threshold to classify as stable.
   */
  private determineTrend(
    current: number,
    previous: number
  ): 'up' | 'down' | 'stable' | 'no-data' {
    if (previous === 0 && current === 0) return 'no-data';
    if (previous === 0) return 'up';

    const diff = current - previous;
    const percentChange = Math.abs(diff) / previous;
    if (percentChange < 0.01) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  /**
   * Aggregates rows into monthly trends ordered chronologically.
   */
  private calculateMonthlyTrends(
    rows: ExportableInformeRow[]
  ): MonthlyTrend[] {
    const grouped = new Map<string, { horas: number; cursos: number }>();

    for (const row of rows) {
      const key = row.mes;
      const existing = grouped.get(key) ?? { horas: 0, cursos: 0 };
      existing.horas += row.horas ?? 0;
      existing.cursos += row.cursos;
      grouped.set(key, existing);
    }

    const sorted = Array.from(grouped.entries()).sort(
      (a, b) => MES_ORDER[a[0] as Mes] - MES_ORDER[b[0] as Mes]
    );

    return sorted.map(([mes, data]) => ({
      mes,
      horas: data.horas,
      cursos: data.cursos,
    }));
  }

  /**
   * Aggregates rows into group comparisons with participation percentages.
   * Defaults null grupo_nombre to "Sin grupo".
   */
  private calculateGroupComparisons(
    rows: ExportableInformeRow[]
  ): GroupComparison[] {
    const grouped = new Map<
      string,
      {
        horas: number;
        cursos: number;
        users: Set<number>;
        participaron: number;
      }
    >();

    for (const row of rows) {
      const grupo = row.grupo_nombre ?? 'Sin grupo';
      const existing = grouped.get(grupo) ?? {
        horas: 0,
        cursos: 0,
        users: new Set<number>(),
        participaron: 0,
      };

      existing.horas += row.horas ?? 0;
      existing.cursos += row.cursos;

      if (!existing.users.has(row.id_usuario)) {
        existing.users.add(row.id_usuario);
        if (row.participacion) {
          existing.participaron++;
        }
      }

      grouped.set(grupo, existing);
    }

    const result: GroupComparison[] = [];
    for (const [grupo, data] of grouped.entries()) {
      const totalUsers = data.users.size;
      result.push({
        grupo,
        horas: data.horas,
        cursos: data.cursos,
        porcentajeParticipacion:
          totalUsers > 0
            ? Math.round((data.participaron / totalUsers) * 100 * 10) / 10
            : 0,
      });
    }

    // Sort by hours descending
    return result.sort((a, b) => b.horas - a.horas);
  }

  /**
   * Categorizes unique publishers into regular / auxiliar / mixto
   * based on their assigned roles from the repository.
   *
   * - regular: roles include 'regular' but not 'auxiliar'
   * - auxiliar: roles include 'auxiliar' but not 'regular'
   * - mixto: both, neither, or only 'publicador'
   */
  private calculateParticipationBreakdown(
    rows: ExportableInformeRow[]
  ): ParticipationBreakdown[] {
    const userMap = new Map<
      number,
      { roles: string; participacion: boolean }
    >();

    for (const row of rows) {
      if (!userMap.has(row.id_usuario)) {
        userMap.set(row.id_usuario, {
          roles: row.roles ?? '',
          participacion: row.participacion,
        });
      }
    }

    let regularCount = 0;
    let auxiliarCount = 0;
    let mixtoCount = 0;

    for (const user of userMap.values()) {
      const roles = user.roles.toLowerCase();
      const hasRegular = roles.includes('regular');
      const hasAuxiliar = roles.includes('auxiliar');

      if (hasRegular && !hasAuxiliar) {
        regularCount++;
      } else if (hasAuxiliar && !hasRegular) {
        auxiliarCount++;
      } else {
        mixtoCount++;
      }
    }

    const total = regularCount + auxiliarCount + mixtoCount;
    if (total === 0) {
      return [
        { tipo: 'regular', cantidad: 0, porcentaje: 0 },
        { tipo: 'auxiliar', cantidad: 0, porcentaje: 0 },
        { tipo: 'mixto', cantidad: 0, porcentaje: 0 },
      ];
    }

    return [
      {
        tipo: 'regular',
        cantidad: regularCount,
        porcentaje: Math.round((regularCount / total) * 100 * 10) / 10,
      },
      {
        tipo: 'auxiliar',
        cantidad: auxiliarCount,
        porcentaje: Math.round((auxiliarCount / total) * 100 * 10) / 10,
      },
      {
        tipo: 'mixto',
        cantidad: mixtoCount,
        porcentaje: Math.round((mixtoCount / total) * 100 * 10) / 10,
      },
    ];
  }
}
