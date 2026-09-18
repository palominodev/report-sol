import { getDatabaseClient } from './database.client';
import {
  IUserRepository,
  CreateUserDTO,
  UpdateUserDTO,
  UserDetails,
} from '@/core/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';

export class TursoUserRepository implements IUserRepository {
  async create(data: CreateUserDTO): Promise<{ id_usuario: number }> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: 'INSERT INTO usuario (nombre, apellido, genero) VALUES (?, ?, ?) RETURNING id_usuario',
      args: [data.nombre, data.apellido, data.genero ?? null],
    });

    const id_usuario = result.rows[0].id_usuario;

    await client.execute({
      sql: 'INSERT INTO grupo_usuario (id_grupo, id_usuario, rol_en_grupo) VALUES (?, ?, ?)',
      args: [data.id_grupo, id_usuario, data.rol_en_grupo],
    });

    for (const rol of data.roles) {
      await client.execute({
        sql: 'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ?, id_rol FROM rol WHERE rol = ?',
        args: [id_usuario, rol],
      });
    }

    return { id_usuario: id_usuario as number };
  }

  async findById(id: number): Promise<User | null> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: 'SELECT * FROM usuario WHERE id_usuario = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as Record<string, unknown>;
    return new User(
      { value: row.id_usuario as number } as any,
      row.nombre as string,
      row.apellido as string,
      [],
      'miembro' as any,
      { value: 0 } as any
    );
  }

  async findByIdWithDetails(id: number): Promise<UserDetails | null> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: `
        SELECT 
          u.id_usuario,
          u.nombre,
          u.apellido,
          u.genero,
          gu.id_grupo,
          gu.rol_en_grupo,
          GROUP_CONCAT(r.rol) as roles
        FROM usuario u
        LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
        LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
        LEFT JOIN rol r ON ur.id_rol = r.id_rol
        WHERE u.id_usuario = ?
        GROUP BY u.id_usuario, u.nombre, u.apellido, gu.id_grupo, gu.rol_en_grupo
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id_usuario: row.id_usuario as number,
      nombre: row.nombre as string,
      apellido: row.apellido as string,
      id_grupo: row.id_grupo == null ? null : Number(row.id_grupo),
      rol_en_grupo: (row.rol_en_grupo as string | null) ?? null,
      roles: (row.roles as string | null) ?? null,
      genero: (row.genero as 'masculino' | 'femenino' | null) ?? null,
    };
  }

  async update(id: number, data: UpdateUserDTO): Promise<void> {
    const client = getDatabaseClient();

    await client.execute({
      sql: 'UPDATE usuario SET nombre = ?, apellido = ?, genero = ? WHERE id_usuario = ?',
      args: [data.nombre, data.apellido, data.genero ?? null, id],
    });

    await client.execute({
      sql: 'UPDATE grupo_usuario SET id_grupo = ?, rol_en_grupo = ? WHERE id_usuario = ?',
      args: [data.id_grupo, data.rol_en_grupo, id],
    });

    await client.execute({
      sql: 'DELETE FROM usuario_rol WHERE id_usuario = ?',
      args: [id],
    });

    for (const rol of data.roles) {
      await client.execute({
        sql: 'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ?, id_rol FROM rol WHERE rol = ?',
        args: [id, rol],
      });
    }
  }

  async delete(id: number): Promise<void> {
    const client = getDatabaseClient();

    await client.execute({
      sql: 'DELETE FROM usuario_rol WHERE id_usuario = ?',
      args: [id],
    });

    await client.execute({
      sql: 'DELETE FROM grupo_usuario WHERE id_usuario = ?',
      args: [id],
    });

    await client.execute({
      sql: 'DELETE FROM usuario WHERE id_usuario = ?',
      args: [id],
    });
  }

  async assignToGroup(userId: number, groupId: number, role: string): Promise<void> {
    const client = getDatabaseClient();

    await client.execute({
      sql: 'INSERT INTO grupo_usuario (id_grupo, id_usuario, rol_en_grupo) VALUES (?, ?, ?)',
      args: [groupId, userId, role],
    });
  }

  async findAllAssignable(): Promise<AssignablePerson[]> {
    const client = getDatabaseClient();
    const result = await client.execute({
      sql: 'SELECT id_usuario, nombre, apellido, genero FROM usuario',
    });
    return result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return new AssignablePerson(
        Number(r.id_usuario),
        r.nombre as string,
        r.apellido as string,
        (r.genero as 'masculino' | 'femenino' | null) ?? null
      );
    });
  }

  async findAllWithDetails(grupoId?: number): Promise<Record<string, unknown>[]> {
    const client = getDatabaseClient();

    const query = `
      SELECT
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.genero,
        gu.id_grupo,
        GROUP_CONCAT(r.rol) as roles,
        g.nombre as grupo
      FROM usuario u
      LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN rol r ON ur.id_rol = r.id_rol
      LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
      LEFT JOIN grupo g ON gu.id_grupo = g.id_grupo
      ${grupoId ? 'WHERE g.id_grupo = ?' : ''}
      GROUP BY u.id_usuario, u.nombre, u.apellido, gu.id_grupo, g.nombre
    `;

    const result = await client.execute({
      sql: query,
      args: grupoId ? [grupoId] : [],
    });

    return result.rows;
  }
}
