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
  informe_enviado: boolean;
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
    roles: row.roles as string | null,
    informe_enviado: false
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

async function getEstadoInformesGrupo(idGrupo: string, mes: string, año: number): Promise<Integrante[]> {
  const client = createClient({ url, authToken: token });
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
    args: [mes, año, idGrupo]
  });
  return result.rows.map(row => ({
    id_usuario: row.id_usuario as number,
    nombre: row.nombre as string,
    apellido: row.apellido as string,
    rol_en_grupo: row.rol_en_grupo as string,
    roles: row.roles as string | null,
    informe_enviado: Boolean(row.informe_enviado)
  }));
}

interface PageProps {
  params: Promise<{
    id_grupo: string;
  }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const now = new Date();
  let mesIdx = now.getMonth();
  let año = now.getFullYear();
  if (mesIdx === 0) {
    mesIdx = 11;
    año -= 1;
  } else {
    mesIdx -= 1;
  }
  const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const mesAnterior = meses[mesIdx];
  const integrantes = await getEstadoInformesGrupo(params.id_grupo, mesAnterior, año);
  const nombreGrupo = await getNombreGrupo(params.id_grupo);
  return <ListaIntegrantes integrantes={integrantes} nombreGrupo={nombreGrupo || ''} mes={mesAnterior} año={año} />;
}