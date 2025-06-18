import Link from "next/link";
import { createClient } from '@libsql/client';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

async function getGrupos() {
  const client = createClient({ url, authToken: token });
  const result = await client.execute(`
    SELECT 
      g.id_grupo,
      g.nombre as nombre_grupo,
      enc.nombre || ' ' || enc.apellido as encargado,
      aux.nombre || ' ' || aux.apellido as auxiliar
    FROM grupo g
    LEFT JOIN grupo_usuario gu_enc ON g.id_grupo = gu_enc.id_grupo AND gu_enc.rol_en_grupo = 'encargado'
    LEFT JOIN usuario enc ON gu_enc.id_usuario = enc.id_usuario
    LEFT JOIN grupo_usuario gu_aux ON g.id_grupo = gu_aux.id_grupo AND gu_aux.rol_en_grupo = 'auxiliar'
    LEFT JOIN usuario aux ON gu_aux.id_usuario = aux.id_usuario
  `);
  return result.rows;
}

export default async function Home() {
  const grupos = await getGrupos();

  return (
    <main className="p-4">
      <section>
        <h1 className="text-2xl font-bold mb-4">Grupos</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map((grupo: any) => (
            <Link key={grupo.id_grupo} href={`grupo/${grupo.id_grupo}/`}>
              <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
                <h2 className="text-xl font-semibold mb-2">{grupo.nombre_grupo}</h2>
                <p className="text-gray-600">Encargado: {grupo.encargado || "Sin asignar"}</p>
                <p className="text-gray-600">Auxiliar: {grupo.auxiliar || "Sin asignar"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
