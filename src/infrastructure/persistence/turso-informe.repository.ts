import { getDatabaseClient } from './database.client';
import { IInformeRepository, InformeUpdateData, InformeCreateData } from '@/core/domain/repositories/IInformeRepository';
import { InformeRow, ExportableInformeRow, Mes } from '@/core/domain/PublisherStats';
import { ValidationError } from '@/core/domain/errors/ValidationError';

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
      notas: row.notas as string | null,
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

  async create(data: InformeCreateData): Promise<InformeRow> {
    const client = getDatabaseClient();

    // Check if the report already exists for this user, month, and year
    const checkResult = await client.execute({
      sql: 'SELECT id_informe FROM informe WHERE id_usuario = ? AND mes = ? AND año = ?',
      args: [data.id_usuario, data.mes, data.año],
    });

    if (checkResult.rows.length > 0) {
      throw new ValidationError('Ya existe un informe para este publicador en el mes indicado.');
    }

    await client.execute({
      sql: `INSERT INTO informe (horas, cursos, año, mes, participacion, id_usuario, trabajo_como_auxiliar, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.horas,
        data.cursos,
        data.año,
        data.mes,
        data.participacion ? 1 : 0,
        data.id_usuario,
        data.trabajo_como_auxiliar ? 1 : 0,
        data.notas,
      ],
    });

    // Fetch the newly created record
    const createdResult = await client.execute({
      sql: 'SELECT * FROM informe WHERE id_usuario = ? AND mes = ? AND año = ?',
      args: [data.id_usuario, data.mes, data.año],
    });

    if (createdResult.rows.length === 0) {
      throw new Error('Error al obtener el informe recién creado.');
    }

    const row = createdResult.rows[0];

    return {
      id_informe: row.id_informe as number,
      fecha_registro: row.fecha_registro as string,
      horas: row.horas as number | null,
      cursos: row.cursos as number,
      año: row.año as number,
      participacion: Boolean(row.participacion),
      trabajo_como_auxiliar: Boolean(row.trabajo_como_auxiliar),
      mes: row.mes as Mes,
      id_usuario: row.id_usuario as number,
      notas: row.notas as string | null,
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

  async findAllWithUsers(): Promise<ExportableInformeRow[]> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: `SELECT i.*, u.nombre, u.apellido, g.nombre as grupo_nombre
            FROM informe i
            JOIN usuario u ON i.id_usuario = u.id_usuario
            LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
            LEFT JOIN grupo g ON gu.id_grupo = g.id_grupo
            ORDER BY i.año DESC, i.mes DESC`,
    });

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
      nombre: row.nombre as string,
      apellido: row.apellido as string,
      grupo_nombre: row.grupo_nombre as string,
      notas: row.notas as string | null,
    }));
  }

  async findAllWithUsersFilter(año: number | null, mes: string | null, rol: string | null, grupo: number | null): Promise<ExportableInformeRow[]> {
    const client = getDatabaseClient();

    let sql = `
      SELECT i.*, u.nombre, u.apellido, g.nombre as grupo_nombre,
             GROUP_CONCAT(DISTINCT r.rol) as roles
      FROM informe i
      JOIN usuario u ON i.id_usuario = u.id_usuario
      LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN rol r ON ur.id_rol = r.id_rol
      LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
      LEFT JOIN grupo g ON gu.id_grupo = g.id_grupo
      WHERE 1=1
    `;
    const args: any[] = [];

    if (año !== null && año !== undefined) {
      sql += ' AND i.año = ?';
      args.push(año);
    }

    if (mes !== null && mes !== undefined && mes !== '') {
      sql += ' AND i.mes = ?';
      args.push(mes);
    }

    if (grupo !== null && grupo !== undefined) {
      sql += ' AND g.id_grupo = ?';
      args.push(grupo);
    }

    sql += ' GROUP BY i.id_informe, u.id_usuario, i.trabajo_como_auxiliar';

    if (rol !== null && rol !== undefined && rol !== '') {
      if (rol === 'auxiliar') {
        sql += ' HAVING (roles LIKE ? OR (roles LIKE ? AND i.trabajo_como_auxiliar = 1))';
        args.push('%auxiliar%', '%publicador%');
      } else {
        sql += ' HAVING roles LIKE ?';
        args.push(`%${rol}%`);
      }
    }

    sql += ' ORDER BY i.año DESC, i.mes DESC';

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
      nombre: row.nombre as string,
      apellido: row.apellido as string,
      grupo_nombre: row.grupo_nombre as string,
      roles: row.roles as string | undefined,
      notas: (row.notas as string | null) ?? null,
    }));
  }
}
