import { createClient } from '@libsql/client';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

interface Integrante {
  id_usuario: number;
  nombre: string;
  apellido: string;
  rol_en_grupo: string;
  roles: string | null;
}

const rolEnGrupoColors: Record<string, string> = {
  'encargado': 'bg-red-100 text-red-800',
  'auxiliar': 'bg-yellow-100 text-yellow-800',
  'miembro': 'bg-green-100 text-green-800'
};

const rolColors: Record<string, string> = {
  'anciano': 'bg-purple-100 text-purple-800',
  'siervo': 'bg-indigo-100 text-indigo-800',
  'coordinador': 'bg-pink-100 text-pink-800',
  'secretario': 'bg-orange-100 text-orange-800',
  'publicador': 'bg-teal-100 text-teal-800',
  'auxiliar': 'bg-yellow-100 text-yellow-800',
  'regular': 'bg-blue-100 text-blue-800'
};

const getRolEnGrupoColor = (rol: string): string => {
  return rolEnGrupoColors[rol] || 'bg-gray-100 text-gray-800';
};

const getRolColor = (rol: string): string => {
  const rolNormalizado = rol.trim().toLowerCase();
  return rolColors[rolNormalizado] || 'bg-gray-100 text-gray-800';
};

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Integrantes del {nombreGrupo}</h1>
      <ul className="space-y-3">
        {integrantes.map((integrante) => (
          <li 
            key={integrante.id_usuario}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{integrante.nombre} {integrante.apellido}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm ${getRolEnGrupoColor(integrante.rol_en_grupo)}`}>
                  {integrante.rol_en_grupo}
                </span>
                {integrante.roles ? (
                  integrante.roles.split(',').map((rol, index) => (
                    <span key={index} className={`px-3 py-1 rounded-full text-sm ${getRolColor(rol)}`}>
                      {rol.trim()}
                    </span>
                  ))
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    Sin roles
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}