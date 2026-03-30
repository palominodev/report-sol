import { InformeRow } from '@/core/domain/PublisherStats';

export interface InformeUpdateData {
  horas: number | null;
  cursos: number;
  participacion: boolean;
  trabajo_como_auxiliar: boolean;
}

export interface IInformeRepository {
  /**
   * Retrieves all reports for a given user, ordered by year and month (ascending).
   * Optionally limited to a specific service year.
   */
  findByUsuarioId(idUsuario: number, año?: number): Promise<InformeRow[]>;

  /**
   * Retrieves the roles assigned to a user from the usuario_rol + rol tables.
   */
  findRolesByUsuarioId(idUsuario: number): Promise<string[]>;

  /**
   * Retrieves basic user info (nombre, apellido, grupo) for the stats header.
   */
  findUserWithGroupById(idUsuario: number): Promise<{
    nombre: string;
    apellido: string;
    grupo: string;
    roles: string[];
  } | null>;

  /**
   * Updates an existing informe by ID.
   */
  update(idInforme: number, data: InformeUpdateData): Promise<void>;

  /**
   * Deletes an informe by ID.
   */
  delete(idInforme: number): Promise<void>;
}
