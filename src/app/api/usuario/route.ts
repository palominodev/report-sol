import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

export async function POST(request: Request) {
  try {
    const { nombre, apellido, id_grupo, roles } = await request.json();
    const client = createClient({ url, authToken: token });

    // Insertar usuario
    const result = await client.execute({
      sql: 'INSERT INTO usuario (nombre, apellido) VALUES (?, ?) RETURNING id_usuario',
      args: [nombre, apellido],
    });
    const id_usuario = result.rows[0].id_usuario;

    // Insertar relación en grupo_usuario
    await client.execute({
      sql: 'INSERT INTO grupo_usuario (id_grupo, id_usuario, rol_en_grupo) VALUES (?, ?, ?)',
      args: [id_grupo, id_usuario, 'miembro'],
    });

    // Insertar roles seleccionados
    for (const rol of roles) {
      await client.execute({
        sql: 'INSERT INTO usuario_rol (id_usuario, id_rol) SELECT ?, id_rol FROM rol WHERE rol = ?',
        args: [id_usuario, rol],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 