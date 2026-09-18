import { Assignment } from '@/domain/entities/presentation/Assignment';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { Sala } from '@/domain/entities/presentation/enums';
import { AssignmentHistoryRow } from './types';

export interface IAssignmentsRepository {
  /**
   * Upserts a scraped week and MERGES its parts (adoption-aware).
   *
   * Merge semantics: existing parts of the week are read first and keyed by
   * `${tipo}|${orden}`. A scraped part with no match is INSERTed (with a
   * race-guard conflict target); a part that matches updates EVERY stored row
   * sharing that key — a stamped 'A' original AND its 'B' clone both get their
   * metadata refreshed, never duplicated, never erased. Per-row
   * `sala = COALESCE(incoming, stored)` keeps the anti-erosion guarantee: a
   * re-sync without room info (sala NULL) never overwrites a known sala, while
   * an explicitly provided sala always wins.
   */
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
  /**
   * Writes a part's sala directly (null = explicit clear). Must NOT go through
   * upsertWeek: its COALESCE guard keeps the old value when incoming is NULL,
   * so a clear would silently no-op.
   */
  updatePartSala(id_part: number, sala: Sala | null): Promise<void>;
  /**
   * Bulk variant of updatePartSala for adoption plans: applies every
   * `{ id_part, sala }` write exactly as given (null = explicit clear) in a
   * single atomic batch.
   */
  bulkUpdatePartSala(updates: { id_part: number; sala: Sala | null }[]): Promise<void>;
  /**
   * Plain batch INSERT of parts (ids assigned by the DB). Needed for sala-B
   * clones: they share `(tipo, orden)` with their 'A' original, so upsertWeek's
   * merge would collapse them into the existing row instead of creating the
   * twin. Creates no assignment rows.
   */
  insertParts(parts: PresentationPart[]): Promise<void>;
}