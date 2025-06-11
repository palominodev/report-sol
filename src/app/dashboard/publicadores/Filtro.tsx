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
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-600">Filtrar por Grupo</label>
      <select
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        value={grupoSeleccionado || ''}
        onChange={handleChange}
      >
        <option value="">Todos los grupos</option>
        {grupos.map((grupo) => (
          <option key={grupo.id_grupo} value={grupo.id_grupo}>
            {grupo.nombre}
          </option>
        ))}
      </select>
    </div>
  );
} 