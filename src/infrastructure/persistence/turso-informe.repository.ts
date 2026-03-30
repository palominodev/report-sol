import { getDatabaseClient } from './database.client';
import { IInformeRepository, InformeUpdateData } from '@/core/domain/repositories/IInformeRepository';
import { InformeRow, Mes } from '@/core/domain/PublisherStats';

export class TursoInformeRepository implements IInformeRepository {
  async findByUsuarioId(idUsuario: number, año?: number): Promise<InformeRow[]> {
    const client = getDatabaseClient();

    const sql = año
      ? 'SELECT * FROM informe WHERE id_usuario = ? AND año = ?'
      : 'SELECT * FROM informe WHERE id_usuario = ?';

    const args = año ? [idUsuario, año] : [idUsuario];

    const result = await client.execute({ sql, args });

    return result.rows.map((row) => ({
      id_informe: row.id_informe as number,
      fecha_registro: row.fecha_registro as string,
      horas: row.horas as number | null,
      cursos: row.cursos as number,
      año: row.año as number,
      participacion: Boolean(row.participacion),
      trabajo_como_auxiliar: Boolean(row.trabajo_como_auxiliar),
      mes: row.mes as Mes,
      id_usuario: row.id_usuario as number,
    }));
  }

  async findRolesByUsuarioId(idUsuario: number): Promise<string[]> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: `SELECT r.rol FROM usuario_rol ur
            JOIN rol r ON ur.id_rol = r.id_rol
            WHERE ur.id_usuario = ?`,
      args: [idUsuario],
    });

    return result.rows.map((row) => row.rol as string);
  }

  async findUserWithGroupById(idUsuario: number): Promise<{
    nombre: string;
    apellido: string;
    grupo: string;
    roles: string[];
  } | null> {
    const client = getDatabaseClient();

    // Get user + group info
    const userResult = await client.execute({
      sql: `SELECT u.nombre, u.apellido, COALESCE(g.nombre, 'Sin grupo') as grupo
            FROM usuario u
            LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
            LEFT JOIN grupo g ON gu.id_grupo = g.id_grupo
            WHERE u.id_usuario = ?`,
      args: [idUsuario],
    });

    if (userResult.rows.length === 0) {
      return null;
    }

    const row = userResult.rows[0];

    // Get roles separately
    const roles = await this.findRolesByUsuarioId(idUsuario);

    return {
      nombre: row.nombre as string,
      apellido: row.apellido as string,
      grupo: row.grupo as string,
      roles,
    };
  }

  async update(idInforme: number, data: InformeUpdateData): Promise<void> {
    const client = getDatabaseClient();

    await client.execute({
      sql: `UPDATE informe 
            SET horas = ?, cursos = ?, participacion = ?, trabajo_como_auxiliar = ?
            WHERE id_informe = ?`,
      args: [
        data.horas,
        data.cursos,
        data.participacion ? 1 : 0,
        data.trabajo_como_auxiliar ? 1 : 0,
        idInforme,
      ],
    });
  }

  async delete(idInforme: number): Promise<void> {
    const client = getDatabaseClient();

    await client.execute({
      sql: 'DELETE FROM informe WHERE id_informe = ?',
      args: [idInforme],
    });
  }
}
