'use client';

import { useState } from 'react';
import { createClient } from '@libsql/client';
import FormularioInforme from './FormularioInforme';

interface Integrante {
  id_usuario: number;
  nombre: string;
  apellido: string;
  rol_en_grupo: string;
  roles: string | null;
}

interface ListaIntegrantesProps {
  integrantes: Integrante[];
  nombreGrupo: string;
}

const url = "libsql://reportsoldb-palominodev.aws-us-east-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDk1OTg4NjksImlkIjoiYmQ3OTc3MzYtYTBlMC00YjUyLWFkNmUtYWQ4OTlhMzBjMTZmIiwicmlkIjoiMzczMTFiZmMtMjI2Mi00YzdlLTg4ZWEtMzMxNmJmYTU2MDZjIn0.oAxJKUB2i3G2GaWw7e0yLLq-_APQdv77H1KsHeIHIZ9MlQRwkLD6mve0tlMGN6RBPuFhvJ2skMzgc9y2Ks30CQ";

// Colores actualizados según el design system
const rolEnGrupoColors: Record<string, string> = {
  'encargado': 'bg-red-500 text-white',
  'auxiliar': 'bg-orange-500 text-white',
  'miembro': 'bg-green-500 text-white'
};

const rolColors: Record<string, string> = {
  'anciano': 'bg-purple-500 text-white',
  'siervo': 'bg-indigo-500 text-white',
  'coordinador': 'bg-pink-500 text-white',
  'secretario': 'bg-orange-500 text-white',
  'publicador': 'bg-teal-500 text-white',
  'auxiliar': 'bg-yellow-500 text-white',
  'regular': 'bg-blue-500 text-white'
};

const getRolEnGrupoColor = (rol: string): string => {
  return rolEnGrupoColors[rol] || 'bg-gray-500 text-white';
};

const getRolColor = (rol: string): string => {
  const rolNormalizado = rol.trim().toLowerCase();
  return rolColors[rolNormalizado] || 'bg-gray-500 text-white';
};

export default function ListaIntegrantes({ integrantes, nombreGrupo }: ListaIntegrantesProps) {
  const [selectedIntegrante, setSelectedIntegrante] = useState<Integrante | null>(null);

  const handleSubmitInforme = async (data: any) => {
    const client = createClient({ url, authToken: token });
    await client.execute({
      sql: `
        INSERT INTO informe (horas, cursos, año, mes, participacion, id_usuario)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [data.horas, data.cursos, data.año, data.mes, data.participacion, selectedIntegrante?.id_usuario]
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                Integrantes del Grupo
              </h1>
              <p className="text-gray-600 text-lg" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                {nombreGrupo}
              </p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{integrantes.length}</div>
              <div className="text-sm text-gray-600 font-medium">Total Integrantes</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {integrantes.filter(i => i.rol_en_grupo === 'encargado').length}
              </div>
              <div className="text-sm text-gray-600 font-medium">Encargados</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {integrantes.filter(i => i.rol_en_grupo === 'auxiliar').length}
              </div>
              <div className="text-sm text-gray-600 font-medium">Auxiliares</div>
            </div>
          </div>
        </div>

        {/* Lista de Integrantes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
              Miembros del Equipo
            </h2>
          </div>
          
          <ul className="divide-y divide-gray-100">
            {integrantes.map((integrante) => (
              <li 
                key={integrante.id_usuario}
                className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer group"
                onClick={() => setSelectedIntegrante(integrante)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {integrante.nombre.charAt(0)}{integrante.apellido.charAt(0)}
                      </span>
                    </div>
                    
                    {/* Información del usuario */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                        {integrante.nombre} {integrante.apellido}
                      </h3>
                      <p className="text-sm text-gray-500" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                        ID: {integrante.id_usuario}
                      </p>
                    </div>
                  </div>
                  
                  {/* Roles */}
                  <div className="flex items-center space-x-2">
                    {/* Rol en grupo */}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getRolEnGrupoColor(integrante.rol_en_grupo)}`}>
                      {integrante.rol_en_grupo}
                    </span>
                    
                    {/* Roles adicionales */}
                    {integrante.roles ? (
                      integrante.roles.split(',').map((rol, index) => (
                        <span key={index} className={`px-2 py-1 rounded-full text-xs font-medium ${getRolColor(rol)}`}>
                          {rol.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Sin roles
                      </span>
                    )}
                    
                    {/* Icono de flecha */}
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {/* Empty State */}
          {integrantes.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay integrantes</h3>
              <p className="text-gray-600">Este grupo aún no tiene miembros asignados.</p>
            </div>
          )}
        </div>
      </div>

      {selectedIntegrante && (
        <FormularioInforme
          id_usuario={selectedIntegrante.id_usuario}
          nombre={selectedIntegrante.nombre}
          apellido={selectedIntegrante.apellido}
          roles={selectedIntegrante.roles ? selectedIntegrante.roles.split(',') : []}
          onClose={() => setSelectedIntegrante(null)}
          onSubmit={handleSubmitInforme}
        />
      )}
    </div>
  );
} 