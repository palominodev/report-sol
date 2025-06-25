'use client'
import { useState, useEffect } from 'react';
import { createClient } from '@libsql/client';
import Filtro from './Filtro';
import MenuAcciones from './MenuAcciones';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

async function getGrupos() {
  const client = createClient({ url, authToken: token });
  const result = await client.execute('SELECT id_grupo, nombre FROM grupo');
  return result.rows;
}

async function getPublicadores(grupoId?: number) {
  const client = createClient({ url, authToken: token });
  const query = `
    SELECT 
      u.id_usuario, 
      u.nombre, 
      u.apellido, 
      GROUP_CONCAT(r.rol) as roles,
      g.nombre as grupo
    FROM usuario u
    LEFT JOIN usuario_rol ur ON u.id_usuario = ur.id_usuario
    LEFT JOIN rol r ON ur.id_rol = r.id_rol
    LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
    LEFT JOIN grupo g ON gu.id_grupo = g.id_grupo
    ${grupoId ? 'WHERE g.id_grupo = ?' : ''}
    GROUP BY u.id_usuario, u.nombre, u.apellido, g.nombre
  `;
  const result = await client.execute({
    sql: query,
    args: grupoId ? [grupoId] : [],
  });
  return result.rows;
}

export default function Publicadores() {
  const router = useRouter()
  const [grupos, setGrupos] = useState<any[]>([]);
  const [publicadores, setPublicadores] = useState<any[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | undefined>(undefined);

  useEffect(() => {
    getGrupos().then(setGrupos);
  }, []);

  useEffect(() => {
    getPublicadores(grupoSeleccionado).then(setPublicadores);
  }, [grupoSeleccionado]);

  const handleEliminar = async (idUsuario: number) => {
    try {
      const response = await fetch(`/api/usuario/${idUsuario}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el usuario');
      }

      // Actualizar la lista de usuarios después de eliminar
      setPublicadores(publicadores.filter(usuario => usuario.id_usuario !== idUsuario));
      
      // Mostrar mensaje de éxito
      alert('Usuario eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar el usuario');
    }
  };

  const handleMoverGrupo = async (idUsuario: number) => {
    // TODO: Implementar lógica para mover a otro grupo
    console.log('Mover usuario:', idUsuario);
  };

  const handleActualizar = async (idUsuario: number) => {
    router.push(`/usuario/editar/${idUsuario}`)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                  Gestión de Publicadores
                </h1>
                <p className="text-gray-600 text-lg" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  Administra y visualiza todos los publicadores registrados
                </p>
              </div>
            </div>
            
            <Link 
              href={'/usuario/nuevo'}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
              style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Crear Publicador
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{publicadores.length}</div>
                <div className="text-sm text-gray-600 font-medium">Total Publicadores</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{grupos.length}</div>
                <div className="text-sm text-gray-600 font-medium">Grupos Activos</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {publicadores.filter(p => p.roles && p.roles.includes('publicador')).length}
                </div>
                <div className="text-sm text-gray-600 font-medium">Con Rol Publicador</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {publicadores.filter(p => p.roles && p.roles.includes('auxiliar')).length}
                </div>
                <div className="text-sm text-gray-600 font-medium">Precursores Auxiliares</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {publicadores.filter(p => p.roles && p.roles.includes('regular')).length}
                </div>
                <div className="text-sm text-gray-600 font-medium">Precursores Regulares</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
            Filtros
          </h3>
          <Filtro
            grupos={grupos}
            grupoSeleccionado={grupoSeleccionado}
            onGrupoChange={setGrupoSeleccionado}
          />
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
              Lista de Publicadores
            </h2>
            <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              {publicadores.length} publicador{publicadores.length !== 1 ? 'es' : ''} encontrado{publicadores.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Publicador
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Roles
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Grupo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {publicadores.map((pub: any) => (
                  <tr key={pub.id_usuario} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {pub.nombre.charAt(0)}{pub.apellido.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                            {pub.nombre} {pub.apellido}
                          </div>
                          <div className="text-sm text-gray-500" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                            ID: {pub.id_usuario}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {pub.roles ? (
                          pub.roles.split(',').map((rol: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {rol.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            Sin roles
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {pub.grupo || 'Sin grupo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <MenuAcciones
                        idUsuario={pub.id_usuario}
                        onEliminar={handleEliminar}
                        onMoverGrupo={handleMoverGrupo}
                        onActualizar={handleActualizar}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Empty State */}
          {publicadores.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay publicadores</h3>
              <p className="text-gray-600">No se encontraron publicadores con los filtros seleccionados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 