import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import {
  MeetingSection,
  PresentationSetting,
  PresentationType,
} from '@/domain/entities/presentation/enums';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';

export interface WeekPartInput {
  orden: number;
  tipo: PresentationType;
  seccion: MeetingSection;
  duracion_min: number;
  escenario: PresentationSetting | null;
  fuente: SourceRef | { fuente: 'lmd' | 'th' | 'bib'; leccion?: number; punto?: string };
}

export interface CreateMeetingWeekInput {
  semana: string;
  issue: string;
  fecha_inicio: string;
  fecha_fin: string;
  parts: WeekPartInput[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMeetingWeekUseCase {
  constructor(private readonly assignmentsRepository: IAssignmentsRepository) {}

  async execute(input: CreateMeetingWeekInput): Promise<{ id_week: number }> {
    if (!DATE_RE.test(input.fecha_inicio) || !DATE_RE.test(input.fecha_fin)) {
      throw new ValidationError('fecha_inicio y fecha_fin deben ser fechas válidas (YYYY-MM-DD)');
    }
    if (input.semana.trim() === '' || input.issue.trim() === '') {
      throw new ValidationError('semana e issue son requeridos');
    }

    const week = new MeetingWeek(0, input.semana, input.issue, input.fecha_inicio, input.fecha_fin, 'no_generada');
    const parts = input.parts.map((p) => {
      const fuente =
        p.fuente instanceof SourceRef
          ? p.fuente
          : new SourceRef(p.fuente.fuente, p.fuente.leccion, p.fuente.punto);
      return new PresentationPart(
        0,
        0,
        p.orden,
        p.tipo,
        p.seccion,
        p.duracion_min,
        p.escenario,
        fuente
      );
    });

    const id_week = await this.assignmentsRepository.upsertWeek(week, parts);
    return { id_week };
  }
}