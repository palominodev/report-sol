import { Genero } from './enums';

/** Congregational role that gates que_diria eligibility (R1). */
export type Cargo = 'anciano' | 'siervo';

/**
 * Projection of a `usuario` used as an assignment candidate.
 * A usuario with NULL genero is not eligible until it is backfilled.
 * `cargo` derives from `usuario_rol` (anciano > siervo > null); NULL cargo is
 * treated as `publicador`. `familia_id` is NULL when unknown ("not family").
 */
export class AssignablePerson {
  constructor(
    public readonly id_usuario: number,
    public readonly nombre: string,
    public readonly apellido: string,
    public readonly genero: Genero | null,
    public readonly cargo: Cargo | null,
    public readonly familia_id: number | null
  ) {}

  elegible(): boolean {
    return this.genero !== null;
  }
}