import { describe, it, expect } from 'vitest';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import type { WeekState } from '@/domain/entities/presentation/enums';
import { groupWeeksByPriority } from '../groupWeeks';

const week = (id: number, estado: WeekState) =>
  new MeetingWeek(id, `Semana ${id}`, '2026-01', '2026-01-05', '2026-01-11', estado);

describe('groupWeeksByPriority', () => {
  it('puts no_generada and borrador weeks in pending, keeping the original order', () => {
    const weeks = [week(1, 'confirmada'), week(2, 'borrador'), week(3, 'no_generada'), week(4, 'borrador')];
    const { pending } = groupWeeksByPriority(weeks);
    expect(pending.map((w) => w.id_week)).toEqual([2, 3, 4]);
  });

  it('puts confirmada weeks in confirmed, keeping the original order', () => {
    const weeks = [week(1, 'confirmada'), week(2, 'borrador'), week(3, 'confirmada')];
    const { confirmed } = groupWeeksByPriority(weeks);
    expect(confirmed.map((w) => w.id_week)).toEqual([1, 3]);
  });

  it('returns two empty groups for no weeks', () => {
    expect(groupWeeksByPriority([])).toEqual({ pending: [], confirmed: [] });
  });

  it('does not mutate the input array', () => {
    const weeks = [week(1, 'confirmada'), week(2, 'borrador')];
    const snapshot = [...weeks];
    groupWeeksByPriority(weeks);
    expect(weeks).toEqual(snapshot);
  });
});
