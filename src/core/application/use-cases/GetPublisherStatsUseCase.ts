import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';
import {
  type Mes,
  type ActivityStatus,
  type ServiceRole,
  type MonthEntry,
  type PeriodAverages,
  type PublisherProfileStats,
  type InformeRow,
} from '@/core/domain/PublisherStats';

/** Maps month abbreviations to numeric order (1-12) */
const MES_ORDER: Record<Mes, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

const NUMERIC_TO_MES: Record<number, Mes> = {
  1: 'ENE', 2: 'FEB', 3: 'MAR', 4: 'ABR', 5: 'MAY', 6: 'JUN',
  7: 'JUL', 8: 'AGO', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DIC',
};

export class GetPublisherStatsUseCase {
  constructor(private readonly informeRepository: IInformeRepository) {}

  async execute(userId: number): Promise<PublisherProfileStats> {
    // 1. Fetch user info
    const userInfo = await this.informeRepository.findUserWithGroupById(userId);
    if (!userInfo) {
      throw new Error(`Publicador con ID ${userId} no encontrado.`);
    }

    // 2. Fetch all reports for this user
    const informes = await this.informeRepository.findByUsuarioId(userId);

    // 3. Sort chronologically
    const sorted = this.sortChronologically(informes);

    // 4. Build month history with trends
    const history = this.buildHistory(sorted, userInfo.roles);

    // 5. Calculate status from the last 6 calendar months
    const status = this.calculateStatus(sorted);

    // 6. Calculate averages (last 6 months of actual data)
    const averages = this.calculateAverages(sorted);

    // 7. Extract pioneer months
    const pioneerMonths = this.extractPioneerMonths(sorted, userInfo.roles);

    return {
      userId,
      nombre: userInfo.nombre,
      apellido: userInfo.apellido,
      roles: userInfo.roles,
      grupo: userInfo.grupo,
      status,
      averages,
      history,
      pioneerMonths,
    };
  }

  /**
   * Sorts reports chronologically ascending by (año, mes).
   */
  private sortChronologically(informes: InformeRow[]): InformeRow[] {
    return [...informes].sort((a, b) => {
      if (a.año !== b.año) return a.año - b.año;
      return MES_ORDER[a.mes] - MES_ORDER[b.mes];
    });
  }

  /**
   * Builds the month-by-month history with trend indicators.
   */
  private buildHistory(sorted: InformeRow[], roles: string[]): MonthEntry[] {
    return sorted.map((informe, index) => {
      const prev = index > 0 ? sorted[index - 1] : null;

      const horasTrend = prev !== null && informe.horas !== null && prev.horas !== null
        ? informe.horas - prev.horas
        : null;

      const cursosTrend = prev !== null
        ? informe.cursos - prev.cursos
        : null;

      return {
        mes: informe.mes,
        año: informe.año,
        horas: informe.horas,
        cursos: informe.cursos,
        participacion: informe.participacion,
        serviceRole: this.determineServiceRole(informe, roles),
        horasTrend,
        cursosTrend,
      };
    });
  }

  /**
   * Determines the service role for a given report month.
   * If `trabajo_como_auxiliar` is true and the user's role includes 'publicador', they were temp auxiliary pioneer.
   * If their role includes 'regular', they are regular pioneer.
   * Otherwise, publicador.
   */
  private determineServiceRole(informe: InformeRow, roles: string[]): ServiceRole {
    if (informe.trabajo_como_auxiliar) {
      return 'precursor_auxiliar';
    }
    if (roles.includes('regular')) {
      return 'precursor_regular';
    }
    return 'publicador';
  }

  /**
   * Determines the publisher's activity status based on the last 6 calendar months.
   *
   * Rules:
   * - INACTIVO: No participation at all in the last 6 months
   * - IRREGULAR: Missed at least 1 month of participation in the last 6 months
   * - ACTIVO: Participated every month for the last 6 months
   */
  private calculateStatus(sorted: InformeRow[]): ActivityStatus {
    const last6CalendarMonths = this.getLast6CalendarMonths();

    // Count how many of the last 6 calendar months have participation
    let participatedCount = 0;
    for (const { mes, año } of last6CalendarMonths) {
      const found = sorted.find(
        (i) => i.mes === mes && i.año === año && i.participacion
      );
      if (found) {
        participatedCount++;
      }
    }

    if (participatedCount === 0) return 'INACTIVO';
    if (participatedCount < 6) return 'IRREGULAR';
    return 'ACTIVO';
  }

  /**
   * Returns the last 6 calendar months from the current date (inclusive of current month).
   */
  private getLast6CalendarMonths(): { mes: Mes; año: number }[] {
    const now = new Date();
    const result: { mes: Mes; año: number }[] = [];

    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNum = date.getMonth() + 1; // getMonth() is 0-indexed
      result.push({
        mes: NUMERIC_TO_MES[monthNum],
        año: date.getFullYear(),
      });
    }

    return result;
  }

  /**
   * Calculates averages over the last 6 months of actual data.
   */
  private calculateAverages(sorted: InformeRow[]): PeriodAverages {
    const last6 = sorted.slice(-6);

    if (last6.length === 0) {
      return { horas: 0, cursos: 0, participationRate: 0 };
    }

    const totalHoras = last6.reduce((sum, i) => sum + (i.horas ?? 0), 0);
    const totalCursos = last6.reduce((sum, i) => sum + i.cursos, 0);
    const totalParticipation = last6.filter((i) => i.participacion).length;

    return {
      horas: Math.round((totalHoras / last6.length) * 10) / 10,
      cursos: Math.round((totalCursos / last6.length) * 10) / 10,
      participationRate: Math.round((totalParticipation / last6.length) * 100),
    };
  }

  /**
   * Extracts the months where the publisher served in a pioneer role.
   */
  private extractPioneerMonths(
    sorted: InformeRow[],
    roles: string[]
  ): { mes: Mes; año: number; role: ServiceRole }[] {
    return sorted
      .map((informe) => ({
        mes: informe.mes,
        año: informe.año,
        role: this.determineServiceRole(informe, roles),
      }))
      .filter((entry) => entry.role !== 'publicador');
  }
}
