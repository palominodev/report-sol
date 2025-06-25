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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
              Gestión de Grupos
            </h1>
            <p className="text-gray-600 text-lg" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              Administra y visualiza todos los grupos de la organización
            </p>
          </div>
        </section>

        {/* Grupos Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {grupos.map((grupo: any) => (
              <Link key={grupo.id_grupo} href={`grupo/${grupo.id_grupo}/`} className="group">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full transition-all duration-200 hover:shadow-md hover:border-blue-200 hover:transform hover:scale-[1.02] group-hover:shadow-lg">
                  {/* Card Header */}
                  <div className="mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                      {grupo.nombre_grupo}
                    </h2>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Encargado</span>
                    </div>
                    <p className="text-gray-600 text-sm pl-4" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                      {grupo.encargado || "Sin asignar"}
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Auxiliar</span>
                    </div>
                    <p className="text-gray-600 text-sm pl-4" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                      {grupo.auxiliar || "Sin asignar"}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                        Ver detalles
                      </span>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Empty State */}
          {grupos.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay grupos disponibles</h3>
              <p className="text-gray-600">Comienza creando tu primer grupo para organizar tu equipo.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
