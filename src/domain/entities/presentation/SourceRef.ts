export type SourceKind = 'lmd' | 'th' | 'bib';

/**
 * Immutable value object referencing the source of a presentation part
 * (fuente, optional lesson, and optional point number).
 */
export class SourceRef {
  constructor(
    public readonly fuente: SourceKind,
    public readonly leccion?: number,
    public readonly punto?: string
  ) {}
}