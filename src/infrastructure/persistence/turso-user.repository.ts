import { getDatabaseClient } from './database.client';
import {
  IUserRepository,
  CreateUserDTO,
  UpdateUserDTO,
} from '@/core/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';

export class TursoUserRepository implements IUserRepository {
  async create(data: CreateUserDTO): Promise<{ id_usuario: number }> {
    const client = getDatabaseClient();

    const result = await client.execute({
      sql: 'INSERT INTO usuario (nombre, apellido) VALUES (?, ?) RETURNING id_usuario',
      args: [data.nombre, data.apellido],
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

  async update(id: number, data: UpdateUserDTO): Promise<void> {
    const client = getDatabaseClient();

    await client.execute({
      sql: 'UPDATE usuario SET nombre = ?, apellido = ? WHERE id_usuario = ?',
      args: [data.nombre, data.apellido, id],
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
}
