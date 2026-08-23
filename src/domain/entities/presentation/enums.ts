export const PRESENTATION_TYPES = [
  'lectura_biblia',
  'empiece_conversaciones',
  'haga_revisitas',
  'haga_discipulos',
  'discurso',
] as const;
export type PresentationType = (typeof PRESENTATION_TYPES)[number];

export const MEETING_SECTIONS = ['TESOROS_DE_LA_BIBLIA', 'SEAMOS_MEJORES_MAESTROS'] as const;
export type MeetingSection = (typeof MEETING_SECTIONS)[number];

export const PRESENTATION_SETTINGS = [
  'DE_CASA_EN_CASA',
  'PREDICACION_INFORMAL',
  'PREDICACION_PUBLICA',
] as const;
export type PresentationSetting = (typeof PRESENTATION_SETTINGS)[number];

export const ASSIGNMENT_ROLES = ['presentador', 'companero'] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

export const ASSIGNMENT_STATES = ['draft', 'confirmed', 'manual'] as const;
export type AssignmentState = (typeof ASSIGNMENT_STATES)[number];

export const GENEROS = ['masculino', 'femenino'] as const;
export type Genero = (typeof GENEROS)[number];

export const WEEK_STATES = ['no_generada', 'borrador', 'confirmada'] as const;
export type WeekState = (typeof WEEK_STATES)[number];

export const TWO_PERSON_PART_TYPES = [
  'empiece_conversaciones',
  'haga_revisitas',
  'haga_discipulos',
] as const;
export type TwoPersonPartType = (typeof TWO_PERSON_PART_TYPES)[number];