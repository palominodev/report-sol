import { MeetingSection, PresentationSetting, PresentationType, Sala, TWO_PERSON_PART_TYPES } from './enums';
import { SourceRef } from './SourceRef';

/** Aggregate root of a meeting presentation part. */
export class PresentationPart {
  constructor(
    public readonly id_part: number,
    public readonly id_week: number,
    public readonly orden: number,
    public readonly tipo: PresentationType,
    public readonly seccion: MeetingSection,
    public readonly duracion_min: number,
    public readonly escenario: PresentationSetting | null,
    public readonly fuente: SourceRef,
    /** Room the part happens in; null when unknown (scraped-only parts). */
    public readonly sala: Sala | null = null
  ) {}

  requiresCompanero(): boolean {
    return (TWO_PERSON_PART_TYPES as readonly string[]).includes(this.tipo);
  }
}