import { Assignment } from '@/domain/entities/presentation/Assignment';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { AssignmentHistoryRow } from './types';

export interface IAssignmentsRepository {
  upsertWeek(w: MeetingWeek, parts: PresentationPart[]): Promise<number>; // returns id_week
  findWeekById(id: number): Promise<MeetingWeek | null>;
  listWeeks(): Promise<MeetingWeek[]>;
  findPartsByWeek(id_week: number): Promise<PresentationPart[]>;
  findPartById(id: number): Promise<PresentationPart | null>;
  findAssignmentsByWeek(id_week: number): Promise<Assignment[]>;
  findRecentAssignments(opts: { desde: string }): Promise<AssignmentHistoryRow[]>;
  upsertAssignment(a: Omit<Assignment, 'id_asignacion'>): Promise<Assignment>;
  deleteNonManualByWeek(id_week: number): Promise<number>;
  confirmWeek(id_week: number): Promise<number>;
}