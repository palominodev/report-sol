import { getDatabaseClient } from './database.client';
import { IGrupoRepository } from '@/core/domain/repositories/IGrupoRepository';
import { Grupo } from '@/domain/entities/Grupo';

export class TursoGrupoRepository implements IGrupoRepository {
  async findAll(): Promise<Grupo[]> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: 'SELECT * FROM grupo',
      args: [],
    });

    return result.rows as unknown as Grupo[];
  }

  async findById(id: number): Promise<Grupo | null> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: 'SELECT * FROM grupo WHERE id_grupo = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as unknown as Grupo;
  }

  async findAllWithDetails(): Promise<Record<string, unknown>[]> {
    const client = getDatabaseClient();

    const result = await client.execute(`
      SELECT 
        g.id_grupo,
        g.nombre as nombre_grupo,
        enc.nombre || ' ' || enc.apellido as encargado,
        aux.nombre || ' ' || aux.apellido as auxiliar
      FROM grupo g
      LEFT JOIN grupo_usuario gu_enc ON g.id_grupo = gu_enc.id_grupo AND gu_enc.rol_en_grupo = 'encargado'
      LEFT JOIN usuario enc ON gu_enc.id_usuario = enc.id_usuario
      LEFT JOIN grupo_usuario gu_aux ON g.id_grupo = gu_aux.id_grupo AND gu_aux.rol_en_grupo = 'auxiliar'
      LEFT JOIN usuario aux ON gu_aux.id_usuario = aux.id_usuario
    `);

    return result.rows;
  }
}
