import { Assignment } from '@/domain/entities/presentation/Assignment';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { MeetingSection, AssignmentState, Sala } from '@/domain/entities/presentation/enums';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';

const PRINTABLE_STATES: AssignmentState[] = ['confirmed', 'manual'];

export type UserNameResolver = (idUsuario: number) => string;

export interface PrintSlotUser {
  id_usuario: number;
  nombre: string;
}

export interface PrintPart {
  id_part: number;
  orden: number;
  tipo: string;
  seccion: MeetingSection;
  duracionMin: number;
  fuente: string;
  sala: Sala | null;
  presentador: PrintSlotUser | null;
  companero: PrintSlotUser | null;
}

export interface PrintSection {
  seccion: MeetingSection;
  parts: PrintPart[];
}

const SECTION_ORDER: MeetingSection[] = ['TESOROS_DE_LA_BIBLIA', 'SEAMOS_MEJORES_MAESTROS'];

export function formatFuente(fuente: SourceRef): string {
  let out = fuente.fuente;
  if (fuente.leccion !== undefined) out += ` lección ${fuente.leccion}`;
  if (fuente.punto !== undefined) out += ` punto ${fuente.punto}`;
  return out;
}

/**
 * Builds the printable weekly program: only assignments whose estado is
 * confirmed or manual, grouped by section, ordered by part orden.
 * A part is omitted when none of its slots hold a printable assignment.
 *
 * Display decision: sala is carried per part and rendered as a per-part
 * badge. Grouping by sala was rejected because `orden` interleaves rooms
 * (both salas run in parallel), so grouping would break meeting chronology.
 * NULL sala renders no label (graceful rendering).
 */
export function buildPrintSections(
  parts: PresentationPart[],
  assignments: Assignment[],
  resolveName: UserNameResolver
): PrintSection[] {
  const printable = assignments.filter((a) => PRINTABLE_STATES.includes(a.estado));

  const bySection = new Map<MeetingSection, PrintPart[]>(
    SECTION_ORDER.map((s) => [s, []])
  );

  const toUser = (a: Assignment | undefined): PrintSlotUser | null =>
    a ? { id_usuario: a.id_usuario, nombre: resolveName(a.id_usuario) } : null;

  const ordered = [...parts].sort((a, b) => a.orden - b.orden);
  for (const part of ordered) {
    const onPart = printable.filter((a) => a.id_part === part.id_part);
    if (onPart.length === 0) continue;

    const presentador = toUser(onPart.find((a) => a.rol === 'presentador'));
    const companero = part.requiresCompanero() ? toUser(onPart.find((a) => a.rol === 'companero')) : null;

    bySection.get(part.seccion)?.push({
      id_part: part.id_part,
      orden: part.orden,
      tipo: part.tipo,
      seccion: part.seccion,
      duracionMin: part.duracion_min,
      fuente: formatFuente(part.fuente),
      sala: part.sala,
      presentador,
      companero,
    });
  }

  return [...bySection.entries()]
    .filter(([, parts]) => parts.length > 0)
    .map(([seccion, parts]) => ({ seccion, parts }));
}