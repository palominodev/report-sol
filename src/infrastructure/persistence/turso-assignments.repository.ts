import { getDatabaseClient } from './database.client';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { AssignmentHistoryRow } from '@/core/domain/presentations/types';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { Assignment } from '@/domain/entities/presentation/Assignment';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import {
  AssignmentRole,
  AssignmentState,
  MeetingSection,
  PresentationSetting,
  PresentationType,
  WeekState,
} from '@/domain/entities/presentation/enums';
import type { InStatement } from '@libsql/client';

function toWeek(row: Record<string, unknown>): MeetingWeek {
  return new MeetingWeek(
    Number(row.id_week),
    row.semana as string,
    row.issue as string,
    row.fecha_inicio as string,
    row.fecha_fin as string,
    row.estado as WeekState
  );
}

function toPart(row: Record<string, unknown>): PresentationPart {
  return new PresentationPart(
    Number(row.id_part),
    Number(row.id_week),
    Number(row.orden),
    row.tipo as PresentationType,
    row.seccion as MeetingSection,
    Number(row.duracion_min),
    (row.escenario as PresentationSetting | null) ?? null,
    new SourceRef(
      row.fuente as 'lmd' | 'th' | 'bib',
      row.leccion == null ? undefined : Number(row.leccion),
      (row.punto as string | undefined) ?? undefined
    )
  );
}

function toAssignment(row: Record<string, unknown>): Assignment {
  return new Assignment(
    Number(row.id_asignacion),
    Number(row.id_part),
    Number(row.id_week),
    Number(row.id_usuario),
    row.rol as AssignmentRole,
    row.estado as AssignmentState
  );
}

function toHistoryRow(row: Record<string, unknown>): AssignmentHistoryRow {
  return {
    id_part: Number(row.id_part),
    id_week: Number(row.id_week),
    id_usuario: Number(row.id_usuario),
    rol: row.rol as AssignmentRole,
    tipo: row.tipo as PresentationType,
  };
}

const WEEK_COLS = 'id_week, semana, issue, fecha_inicio, fecha_fin, estado';
const PART_COLS = 'id_part, id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto';
const ASSIGNMENT_COLS = 'id_asignacion, id_part, id_week, id_usuario, rol, estado';

export class TursoAssignmentsRepository implements IAssignmentsRepository {
  async upsertWeek(w: MeetingWeek, parts: PresentationPart[]): Promise<number> {
    const client = getDatabaseClient();

    const weekResult = await client.execute({
      sql: `INSERT INTO presentation_week (semana, issue, fecha_inicio, fecha_fin, estado)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(semana) DO UPDATE SET
          issue = excluded.issue,
          fecha_inicio = excluded.fecha_inicio,
          fecha_fin = excluded.fecha_fin,
          estado = excluded.estado
        RETURNING id_week`,
      args: [w.semana, w.issue, w.fecha_inicio, w.fecha_fin, w.estado],
    });
    const id_week = Number(weekResult.rows[0].id_week);

    const partStatements: InStatement[] = parts.map((p) => ({
      sql: `INSERT INTO presentation_part
        (id_week, orden, tipo, seccion, duracion_min, escenario, fuente, leccion, punto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id_week, tipo, orden) DO UPDATE SET
          seccion = excluded.seccion,
          duracion_min = excluded.duracion_min,
          escenario = excluded.escenario,
          fuente = excluded.fuente,
          leccion = excluded.leccion,
          punto = excluded.punto`,
      args: [
        id_week,
        p.orden,
        p.tipo,
        p.seccion,
        p.duracion_min,
        p.escenario,
        p.fuente.fuente,
        p.fuente.leccion ?? null,
        p.fuente.punto ?? null,
      ],
    }));

    await client.batch(partStatements);
    return id_week;
  }

  async findWeekById(id: number): Promise<MeetingWeek | null> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `SELECT ${WEEK_COLS} FROM presentation_week WHERE id_week = ?`,
      args: [id],
    });
    if (result.rows.length === 0) return null;
    return toWeek(result.rows[0] as Record<string, unknown>);
  }

  async listWeeks(): Promise<MeetingWeek[]> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `SELECT ${WEEK_COLS} FROM presentation_week ORDER BY fecha_inicio`,
    });
    return result.rows.map((r) => toWeek(r as Record<string, unknown>));
  }

  async findPartsByWeek(id_week: number): Promise<PresentationPart[]> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `SELECT ${PART_COLS} FROM presentation_part WHERE id_week = ? ORDER BY orden`,
      args: [id_week],
    });
    return result.rows.map((r) => toPart(r as Record<string, unknown>));
  }

  async findPartById(id: number): Promise<PresentationPart | null> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `SELECT ${PART_COLS} FROM presentation_part WHERE id_part = ?`,
      args: [id],
    });
    if (result.rows.length === 0) return null;
    return toPart(result.rows[0] as Record<string, unknown>);
  }

  async findAssignmentsByWeek(id_week: number): Promise<Assignment[]> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `SELECT ${ASSIGNMENT_COLS} FROM presentation_assignment WHERE id_week = ?`,
      args: [id_week],
    });
    return result.rows.map((r) => toAssignment(r as Record<string, unknown>));
  }

  async findRecentAssignments(opts: { desde: string }): Promise<AssignmentHistoryRow[]> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `SELECT a.id_part, a.id_week, a.id_usuario, a.rol, p.tipo
        FROM presentation_assignment a
        JOIN presentation_week w ON a.id_week = w.id_week
        JOIN presentation_part p ON a.id_part = p.id_part
        WHERE w.fecha_inicio >= ?
        ORDER BY w.fecha_inicio`,
      args: [opts.desde],
    });
    return result.rows.map((r) => toHistoryRow(r as Record<string, unknown>));
  }

  async upsertAssignment(a: Omit<Assignment, 'id_asignacion'>): Promise<Assignment> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id_part, rol) DO UPDATE SET
          id_usuario = excluded.id_usuario,
          estado = excluded.estado
        RETURNING ${ASSIGNMENT_COLS}`,
      args: [a.id_part, a.id_week, a.id_usuario, a.rol, a.estado],
    });
    return toAssignment(result.rows[0] as Record<string, unknown>);
  }

  async deleteNonManualByWeek(id_week: number): Promise<number> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `DELETE FROM presentation_assignment
        WHERE id_week = ? AND estado IN ('draft', 'confirmed')
        RETURNING id_asignacion`,
      args: [id_week],
    });
    return result.rows.length;
  }

  async confirmWeek(id_week: number): Promise<number> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: `UPDATE presentation_assignment
        SET estado = 'confirmed' WHERE id_week = ? AND estado = 'draft'
        RETURNING id_asignacion`,
      args: [id_week],
    });
    // Flip the week itself from borrador to confirmada once drafts are promoted.
    await client.execute({
      sql: `UPDATE presentation_week SET estado = 'confirmada' WHERE id_week = ?`,
      args: [id_week],
    });
    return result.rows.length;
  }
}