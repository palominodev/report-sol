import { Genero } from './enums';

/**
 * Projection of a `usuario` used as an assignment candidate.
 * A usuario with NULL genero is not eligible until it is backfilled.
 */
export class AssignablePerson {
  constructor(
    public readonly id_usuario: number,
    public readonly nombre: string,
    public readonly apellido: string,
    public readonly genero: Genero | null
  ) {}

  elegible(): boolean {
    return this.genero !== null;
  }
}