import { AssignmentRole, PresentationType, Sala } from '@/domain/entities/presentation/enums';

/** Lightweight history row sent before the user opens an assignment. */
export interface AssignmentHistoryEntry {
  id_asignacion: number;
  id_usuario: number;
  id_week: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface AssignmentHistoryDetail extends AssignmentHistoryEntry {
  tipo: PresentationType;
  rol: AssignmentRole;
  sala: Sala | null;
}
