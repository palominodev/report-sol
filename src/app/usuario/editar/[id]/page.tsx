import { createClient } from '@libsql/client';
import FormularioUsuario from '../../../components/FormularioUsuario';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

async function getGrupos() {
  const client = createClient({ url, authToken: token });
  const result = await client.execute('SELECT id_grupo, nombre FROM grupo');
  return result.rows.map(row => ({ id_grupo: row.id_grupo as number, nombre: row.nombre as string }));
}

async function getUsuario(id: string) {
  const client = createClient({ url, authToken: token });
  const result = await client.execute({
    sql: `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
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
    args: [id]
  });

  if (result.rows.length === 0) {
    return null;
  }

  const usuario = result.rows[0];
  return {
    id_usuario: usuario.id_usuario as number,
    nombre: usuario.nombre as string,
    apellido: usuario.apellido as string,
    id_grupo: usuario.id_grupo?.toString() || "",
    roles: usuario.roles ? (usuario.roles as string).split(',') : [],
    rol_en_grupo: usuario.rol_en_grupo as string || "miembro"
  };
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const usuario = await getUsuario(params.id);

  if (!usuario) {
    notFound();
  }

  const grupos = await getGrupos();

  return (
    <FormularioUsuario
      grupos={grupos}
      usuarioInicial={usuario}
      titulo={`Editar Usuario ${usuario.nombre} ${usuario.apellido}`}
      textoBoton="Actualizar"
      esEdicion={true}
    />
  );
} 