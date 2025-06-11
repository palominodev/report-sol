import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { nombre, apellido, id_grupo, roles, rol_en_grupo } = await request.json();
    const { id } = await params;
    const client = createClient({ url, authToken: token });

    // Actualizar datos básicos del usuario
    await client.execute({
      sql: 'UPDATE usuario SET nombre = ?, apellido = ? WHERE id_usuario = ?',
      args: [nombre, apellido, id],
    });

    // Actualizar grupo y rol en grupo
    await client.execute({
      sql: 'UPDATE grupo_usuario SET id_grupo = ?, rol_en_grupo = ? WHERE id_usuario = ?',
      args: [id_grupo, rol_en_grupo, id],
    });

    // Eliminar roles actuales
    await client.execute({
      sql: 'DELETE FROM usuario_rol WHERE id_usuario = ?',
      args: [id],
    });

    // Insertar nuevos roles
    for (const rol of roles) {
      await client.execute({
        sql: 'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ?, id_rol FROM rol WHERE rol = ?',
        args: [id, rol],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 