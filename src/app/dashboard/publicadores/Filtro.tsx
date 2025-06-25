'use client'
import { ChangeEvent } from 'react';

interface Grupo {
  id_grupo: number;
  nombre: string;
}

interface FiltroProps {
  grupos: Grupo[];
  grupoSeleccionado: number | undefined;
  onGrupoChange: (grupoId: number | undefined) => void;
}

export default function Filtro({ grupos, grupoSeleccionado, onGrupoChange }: FiltroProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onGrupoChange(e.target.value ? Number(e.target.value) : undefined);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
      <div className="flex-1">
        <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
          Filtrar por Grupo
        </label>
        <div className="relative">
          <select
            className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
            value={grupoSeleccionado || ''}
            onChange={handleChange}
            style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
          >
            <option value="">Todos los grupos</option>
            {grupos.map((grupo) => (
              <option key={grupo.id_grupo} value={grupo.id_grupo}>
                {grupo.nombre}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Clear Filter Button */}
      {grupoSeleccionado && (
        <button
          onClick={() => onGrupoChange(undefined)}
          className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
          style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpiar Filtro
        </button>
      )}
    </div>
  );
} 