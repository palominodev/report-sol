/**
 * Types for the Dashboard Statistics feature.
 * These are pure domain types with no infrastructure dependencies.
 */

import type { Mes } from '../PublisherStats';

export type TrendDirection = 'up' | 'down' | 'stable' | 'no-data';

/** Individual KPI card data */
export interface KpiData {
  label: string;
  valor: number;
  unidad: string;
  tendencia: TrendDirection;
  valorPrevio: number;
}

/** Monthly trend data point for the area chart */
export interface MonthlyTrend {
  mes: string;
  horas: number;
  cursos: number;
}

/** Group comparison data point for the bar chart */
export interface GroupComparison {
  grupo: string;
  horas: number;
  cursos: number;
  porcentajeParticipacion: number;
}

/** Participation breakdown for pie/donut chart */
export interface ParticipationBreakdown {
  tipo: 'regular' | 'auxiliar' | 'mixto';
  cantidad: number;
  porcentaje: number;
}

/** Top-level aggregate returned by the use case */
export interface DashboardStats {
  kpis: KpiData[];
  monthlyTrends: MonthlyTrend[];
  groupComparisons: GroupComparison[];
  participationBreakdown: ParticipationBreakdown[];
}

/** Filters accepted by the use case and API */
export interface DashboardFilters {
  año?: number;
  mes?: string;
  rol?: string;
  grupo?: number;
}
