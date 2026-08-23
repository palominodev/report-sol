import {
  WeekState,
  AssignmentState,
  PresentationType,
  MeetingSection,
} from '@/domain/entities/presentation/enums';

export interface BadgeMeta {
  label: string;
  badgeClass: string;
}

const WEEK_ESTADO_META: Record<WeekState, BadgeMeta> = {
  no_generada: { label: 'No generada', badgeClass: 'bg-gray-100 text-gray-700 border-gray-200' },
  borrador: { label: 'Borrador', badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmada: { label: 'Confirmada', badgeClass: 'bg-green-100 text-green-700 border-green-200' },
};

export function weekEstadoMeta(estado: WeekState): BadgeMeta {
  return WEEK_ESTADO_META[estado];
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