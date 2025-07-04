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
  informe_enviado: boolean;
}

interface ListaIntegrantesProps {
  integrantes: Integrante[];
  nombreGrupo: string;
  mes: string;
  año: number;
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

// Componente para mostrar mensaje de informe ya enviado
function MensajeInformeEnviado({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F44336] to-[#D32F2F] rounded-t-xl p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#F44336] bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                  Informe Ya Enviado
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-[#F44336] bg-opacity-20 rounded-lg flex items-center justify-center text-white hover:bg-opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
              Este informe ya fue enviado
            </h3>
            <p className="text-gray-600 mb-6" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              Comuniquese con su encargado para que se pueda enviar un nuevo informe.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#F44336] to-[#D32F2F] rounded-lg hover:from-[#D32F2F] hover:to-[#F44336] transition-all shadow-sm"
              style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Nuevo componente filtro
function FiltroInformes({ estado, setEstado }: { estado: string; setEstado: (v: string) => void }) {
  return (
    <div className="mb-4 flex gap-2 items-center">
      <label
        className="font-semibold text-sm"
        style={{
          fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif',
          color: '#333333',
        }}
      >
        Filtrar por estado de informe:
      </label>
      <select
        value={estado}
        onChange={e => setEstado(e.target.value)}
        className="focus:outline-none transition-all"
        style={{
          padding: '12px 16px',
          border: '1px solid #E0E0E0',
          borderRadius: '4px',
          fontSize: '14px',
          fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif',
          color: '#333333',
          backgroundColor: '#FFFFFF',
        }}
      >
        <option value="todos">Todos</option>
        <option value="enviados">Enviados</option>
        <option value="pendientes">Pendientes</option>
      </select>
    </div>
  );
}

export default function ListaIntegrantes({ integrantes, nombreGrupo, mes, año }: ListaIntegrantesProps) {
  const [selectedIntegrante, setSelectedIntegrante] = useState<Integrante | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [showMensajeEnviado, setShowMensajeEnviado] = useState<boolean>(false);

  const integrantesFiltrados = integrantes.filter(i => {
    if (estadoFiltro === 'enviados') return i.informe_enviado;
    if (estadoFiltro === 'pendientes') return !i.informe_enviado;
    return true;
  });

  const handleIntegranteClick = (integrante: Integrante) => {
    if (integrante.informe_enviado) {
      setShowMensajeEnviado(true);
    } else {
      setSelectedIntegrante(integrante);
    }
  };

  const handleSubmitInforme = async (data: any) => {
    const client = createClient({ url, authToken: token });
    await client.execute({
      sql: `
        INSERT INTO informe (horas, cursos, año, mes, participacion, id_usuario, trabajo_como_auxiliar)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [data.horas, data.cursos, data.año, data.mes, data.participacion, selectedIntegrante?.id_usuario, data.trabajo_como_auxiliar]
    });
    
    // Recargar la página después de enviar el informe
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        {/* Filtro de informes */}
        <FiltroInformes estado={estadoFiltro} setEstado={setEstadoFiltro} />
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
            <p className="text-sm text-gray-500 mt-1">Estado de informe de {mes} {año}</p>
          </div>
          
          <ul className="divide-y divide-gray-100">
            {integrantesFiltrados.map((integrante) => (
              <li 
                key={integrante.id_usuario}
                className={`px-6 py-4 transition-colors duration-150 group ${
                  integrante.informe_enviado 
                    ? 'cursor-not-allowed opacity-75' 
                    : 'hover:bg-gray-50 cursor-pointer'
                }`}
                onClick={() => handleIntegranteClick(integrante)}
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
                      <h3 className={`text-lg font-semibold transition-colors ${
                        integrante.informe_enviado 
                          ? 'text-gray-500' 
                          : 'text-gray-900 group-hover:text-blue-600'
                      }`} style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                        {integrante.nombre} {integrante.apellido} {integrante.informe_enviado ? (
                      <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">Enviado</span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-xs font-semibold uppercase tracking-wide">Pendiente</span>
                    )}
                      </h3>
                      <p className="text-sm text-gray-500" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                        ID: {integrante.id_usuario}
                      </p>
                    </div>
                  </div>
                  
                  {/* Estado de informe */}
                  <div className="flex items-center space-x-2">
                    {/* Rol en grupo */}
                    {
                      integrante.rol_en_grupo !== 'miembro' && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getRolEnGrupoColor(integrante.rol_en_grupo)}`}>
                          {integrante.rol_en_grupo}
                        </span>
                      )
                    }
                    
                    {/* Estado informe */}
                    
                    
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
                    
                    {/* Icono de flecha - solo mostrar si no está enviado */}
                    {!integrante.informe_enviado && (
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
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

      {/* Modal de formulario de informe */}
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

      {/* Modal de mensaje de informe ya enviado */}
      {showMensajeEnviado && (
        <MensajeInformeEnviado onClose={() => setShowMensajeEnviado(false)} />
      )}
    </div>
  );
} 