import type { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';

export interface WeekGroups {
  /** Weeks that still need action (no_generada, borrador), in the original order. */
  pending: MeetingWeek[];
  /** Weeks already confirmed, in the original order. */
  confirmed: MeetingWeek[];
}

/** Splits weeks by whether the person still has something to do with them. Does not mutate the input. */
export function groupWeeksByPriority(weeks: readonly MeetingWeek[]): WeekGroups {
  return {
    pending: weeks.filter((w) => w.estado !== 'confirmada'),
    confirmed: weeks.filter((w) => w.estado === 'confirmada'),
  };
}
