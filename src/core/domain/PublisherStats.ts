/**
 * Types for the Publisher Statistics feature.
 * These are pure domain types with no infrastructure dependencies.
 */

export type Mes = 'ENE' | 'FEB' | 'MAR' | 'ABR' | 'MAY' | 'JUN' | 'JUL' | 'AGO' | 'SEP' | 'OCT' | 'NOV' | 'DIC';

export type ActivityStatus = 'ACTIVO' | 'IRREGULAR' | 'INACTIVO';

export type ServiceRole = 'precursor_auxiliar' | 'precursor_regular' | 'publicador';

/** Raw report row as returned from the database */
export interface InformeRow {
  id_informe: number;
  fecha_registro: string;
  horas: number | null;
  cursos: number;
  año: number;
  participacion: boolean;
  trabajo_como_auxiliar: boolean;
  mes: Mes;
  id_usuario: number;
  nombre?: string;
  apellido?: string;
  grupo_nombre?: string;
}

/** A single month entry in the publisher's history */
export interface MonthEntry {
  mes: Mes;
  año: number;
  horas: number | null;
  cursos: number;
  participacion: boolean;
  serviceRole: ServiceRole;
  /** Trend compared to previous month: positive = improvement, negative = decline, 0 = same */
  horasTrend: number | null;
  cursosTrend: number | null;
}

/** Averages for a given period */
export interface PeriodAverages {
  horas: number;
  cursos: number;
  participationRate: number;
}

/** The complete stats profile for a publisher */
export interface PublisherProfileStats {
  userId: number;
  nombre: string;
  apellido: string;
  roles: string[];
  grupo: string;
  status: ActivityStatus;
  averages: PeriodAverages;
  history: MonthEntry[];
  pioneerMonths: { mes: Mes; año: number; role: ServiceRole }[];
}
