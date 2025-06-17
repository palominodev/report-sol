import { createClient } from '@libsql/client';
import ListaIntegrantes from '../../../components/ListaIntegrantes';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

interface Integrante {
  id_usuario: number;
  nombre: string;
  apellido: string;
  rol_en_grupo: string;
  roles: string | null;
}

async function getIntegrantesGrupo(idGrupo: string): Promise<Integrante[]> {
  const client = createClient({ url, authToken: token });
  const result = await client.execute({
    sql: `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        gu.rol_en_grupo,
        GROUP_CONCAT(r.rol) as roles
      FROM usuario u
      JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
      LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
      LEFT JOIN rol r ON ur.id_rol = r.id_rol
      WHERE gu.id_grupo = ?
      GROUP BY u.id_usuario, u.nombre, u.apellido, gu.rol_en_grupo
    `,
    args: [idGrupo]
  });
  
  return result.rows.map(row => ({
    id_usuario: row.id_usuario as number,
    nombre: row.nombre as string,
    apellido: row.apellido as string,
    rol_en_grupo: row.rol_en_grupo as string,
    roles: row.roles as string | null
  }));
}

async function getNombreGrupo(idGrupo: string): Promise<string | undefined> {
  const client = createClient({ url, authToken: token });
  const result = await client.execute({
    sql: 'SELECT nombre FROM grupo WHERE id_grupo = ?',
    args: [idGrupo]
  });
  return result.rows[0]?.nombre as string | undefined;
}

interface PageProps {
  params: Promise<{
    id_grupo: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const integrantes = await getIntegrantesGrupo(params.id_grupo);
  const nombreGrupo = await getNombreGrupo(params.id_grupo);

  return <ListaIntegrantes integrantes={integrantes} nombreGrupo={nombreGrupo || ''} />;
}