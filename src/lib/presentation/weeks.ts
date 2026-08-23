import { getGetWeekAssignmentsUseCase } from '@/infrastructure/config/di';
import { getAssignmentsRepository } from '@/infrastructure/config/di';
import { getUserRepository } from '@/infrastructure/config/di';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { Assignment } from '@/domain/entities/presentation/Assignment';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';

export async function getWeeks(): Promise<MeetingWeek[]> {
  return getAssignmentsRepository().listWeeks();
}

export interface WeekDetail {
  week: MeetingWeek;
  parts: PresentationPart[];
  assignments: Assignment[];
}

export async function getWeekDetail(idWeek: number): Promise<WeekDetail> {
  const result = await getGetWeekAssignmentsUseCase().execute({ id_week: idWeek });
  return { week: result.week, parts: result.parts, assignments: result.assignments };
}

export async function getAssignableUsers(): Promise<AssignablePerson[]> {
  return getUserRepository().findAllAssignable();
}