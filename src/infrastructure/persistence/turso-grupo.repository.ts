import { getDatabaseClient } from './database.client';
import { IGrupoRepository, GrupoDetails, GrupoMemberReportStatus } from '@/core/domain/repositories/IGrupoRepository';
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

  async findNombreById(id: number): Promise<string | null> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: 'SELECT nombre FROM grupo WHERE id_grupo = ?',
      args: [id],
    });

    return (result.rows[0]?.nombre as string | undefined) ?? null;
  }

  async findMembersWithReportStatus(
    idGrupo: number,
    mes: string,
    año: number
  ): Promise<GrupoMemberReportStatus[]> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: `
        SELECT 
          u.id_usuario,
          u.nombre,
          u.apellido,
          gu.rol_en_grupo,
          GROUP_CONCAT(r.rol) as roles,
          CASE WHEN i.id_informe IS NOT NULL THEN 1 ELSE 0 END as informe_enviado
        FROM grupo_usuario gu
        JOIN usuario u ON gu.id_usuario = u.id_usuario
        LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
        LEFT JOIN rol r ON ur.id_rol = r.id_rol
        LEFT JOIN informe i 
          ON i.id_usuario = u.id_usuario 
          AND i.mes = ? 
          AND i.año = ?
        WHERE gu.id_grupo = ?
        GROUP BY u.id_usuario, u.nombre, u.apellido, gu.rol_en_grupo
      `,
      args: [mes, año, idGrupo],
    });

    return result.rows.map((row) => ({
      id_usuario: row.id_usuario as number,
      nombre: row.nombre as string,
      apellido: row.apellido as string,
      rol_en_grupo: row.rol_en_grupo as string,
      roles: (row.roles as string | null) ?? null,
      informe_enviado: Boolean(row.informe_enviado),
    }));
  }

  async findAllWithDetails(): Promise<GrupoDetails[]> {
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

    return result.rows.map((row) => ({
      id_grupo: row.id_grupo as number,
      nombre_grupo: row.nombre_grupo as string,
      encargado: row.encargado as string | null,
      auxiliar: row.auxiliar as string | null,
    }));
  }

  async create(nombre: string): Promise<Grupo> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: 'INSERT INTO grupo (nombre) VALUES (?) RETURNING *',
      args: [nombre],
    });

    return result.rows[0] as unknown as Grupo;
  }

  async delete(id: number): Promise<void> {
    const client = getDatabaseClient();

    await client.execute({
      sql: 'DELETE FROM grupo WHERE id_grupo = ?',
      args: [id],
    });
  }

  async countMembers(id: number): Promise<number> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: 'SELECT COUNT(*) as total FROM grupo_usuario WHERE id_grupo = ?',
      args: [id],
    });

    return Number(result.rows[0]?.total ?? 0);
  }
}
