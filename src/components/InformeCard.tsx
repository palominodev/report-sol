import React from 'react';

interface Informe {
  id_informe: number;
  fecha_registro: string;
  horas: number;
  cursos: number;
  año: number;
  mes: string;
  participacion: boolean;
  nombre: string;
  apellido: string;
  roles: string;
  nombre_grupo: string;
  trabajo_como_auxiliar: boolean;
}

export default function InformeCard({ informe }: { informe: Informe }) {
  const esPublicador = informe.roles.split(',').map(r => r.trim()).includes('publicador');
  return (
    <div
      className="bg-white rounded-lg border border-gray-100 p-6 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {informe.nombre.charAt(0)}{informe.apellido.charAt(0)}
            </span>
          </div>
          {/* User Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
              {informe.nombre} {informe.apellido}
            </h3>
            <p className="text-sm text-gray-600" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              {informe.nombre_grupo || 'Sin grupo asignado'}
            </p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              Registrado: {new Date(new Date(informe.fecha_registro).getTime() - (5 * 60 * 60 * 1000)).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'America/Lima'
              })}
            </p>
          </div>
        </div>
        {/* Status Badges */}
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
            {informe.mes} {informe.año}
          </span>
          {informe.participacion && (
            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
              Participó
            </span>
          )}
          {esPublicador && informe.trabajo_como_auxiliar && (
            <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
              Precursor auxiliar Temporal
            </span>
          )}
        </div>
      </div>
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{informe.horas}</div>
          <div className="text-sm text-gray-600 font-medium">Horas</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{informe.cursos}</div>
          <div className="text-sm text-gray-600 font-medium">Cursos</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {informe.participacion ? 'Sí' : 'No'}
          </div>
          <div className="text-sm text-gray-600 font-medium">Participación</div>
        </div>
      </div>
      {/* Roles */}
      {informe.roles && (
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
              Roles:
            </span>
            <div className="flex flex-wrap gap-1">
              {informe.roles.split(',').map((rol, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  {rol.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 