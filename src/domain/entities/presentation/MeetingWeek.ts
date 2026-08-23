import { WeekState } from './enums';

/** A meeting week identified by its date range (semana). */
export class MeetingWeek {
  constructor(
    public readonly id_week: number,
    public readonly semana: string,
    public readonly issue: string,
    public readonly fecha_inicio: string,
    public readonly fecha_fin: string,
    public readonly estado: WeekState
  ) {}
}