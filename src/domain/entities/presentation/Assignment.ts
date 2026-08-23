import { AssignmentRole, AssignmentState } from './enums';

/** A single role assignment (presentador or companero) on a presentation part. */
export class Assignment {
  constructor(
    public readonly id_asignacion: number,
    public readonly id_part: number,
    public readonly id_week: number,
    public readonly id_usuario: number,
    public readonly rol: AssignmentRole,
    public readonly estado: AssignmentState
  ) {}
}