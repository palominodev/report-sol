import {
  WeekState,
  AssignmentState,
  PresentationType,
  MeetingSection,
  Sala,
} from '@/domain/entities/presentation/enums';

export interface BadgeMeta {
  label: string;
  badgeClass: string;
}

const WEEK_ESTADO_META: Record<WeekState, BadgeMeta> = {
  no_generada: { label: 'No generada', badgeClass: 'bg-nav text-ink-muted border-line' },
  borrador: { label: 'Borrador', badgeClass: 'bg-amber-300/10 text-amber-300 border-amber-300/40' },
  confirmada: { label: 'Confirmada', badgeClass: 'bg-emerald-300/10 text-emerald-300 border-emerald-300/40' },
};

export function weekEstadoMeta(estado: WeekState): BadgeMeta {
  return WEEK_ESTADO_META[estado];
}

const WEEK_NEXT_STEP: Record<WeekState, string> = {
  no_generada: 'Falta generar',
  borrador: 'Revisar y confirmar',
  confirmada: 'Lista para imprimir',
};

/** Short hint of what the person should do next with a week, shown in the weeks list. */
export function weekNextStep(estado: WeekState): string {
  return WEEK_NEXT_STEP[estado];
}

const ASSIGNMENT_ESTADO_LABELS: Record<AssignmentState, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmado',
  manual: 'Manual',
};

export function assignmentEstadoLabel(estado: AssignmentState): string {
  return ASSIGNMENT_ESTADO_LABELS[estado] ?? estado;
}

const PRESENTATION_TYPE_LABELS: Record<PresentationType, string> = {
  lectura_biblia: 'Lectura de la Biblia',
  empiece_conversaciones: 'Empiece conversaciones',
  haga_revisitas: 'Haga revisitas',
  haga_discipulos: 'Haga discípulos',
  discurso: 'Discurso',
  que_diria: '¿Qué diría?',
  explique_sus_creencias: 'Explique sus creencias',
};

export function presentationTypeLabel(tipo: PresentationType): string {
  return PRESENTATION_TYPE_LABELS[tipo];
}

const SECTION_LABELS: Record<MeetingSection, string> = {
  TESOROS_DE_LA_BIBLIA: 'TESOROS DE LA BIBLIA',
  SEAMOS_MEJORES_MAESTROS: 'SEAMOS MEJORES MAESTROS',
};

export function meetingSectionLabel(seccion: MeetingSection): string {
  return SECTION_LABELS[seccion];
}

/**
 * Canonical room labels. Consumed by the sala tabs (`?sala=`) and the
 * per-room print header, so both surfaces can never drift apart.
 */
export const SALA_LABELS: Record<Sala, string> = {
  A: 'Sala A (Principal)',
  B: 'Sala B (Auxiliar)',
};

/**
 * Display label for a part's sala, or null when the room is unknown (NULL).
 * Callers render no badge when this returns null (graceful rendering).
 */
export function salaLabel(sala: Sala | null): string | null {
  return sala === null ? null : SALA_LABELS[sala];
}