'use client';

import { useState, useEffect, useCallback } from 'react';
import EstadisticasInformes from './EstadisticasInformes';
import InformeCard from './InformeCard';

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
  notas: string | null;
}

interface Filtros {
  año: number;
  mes: string;
  rol: string;
  grupo: string;
}

interface ListaInformesProps {
  filtros: Filtros;
  onFiltrosChange: (filtros: Filtros) => void;
}

const meses = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

const roles = [
  { id: 'publicador', label: 'Publicador' },
  { id: 'auxiliar', label: 'Auxiliar' },
  { id: 'regular', label: 'Regular' }
];

export default function ListaInformes({ filtros, onFiltrosChange }: ListaInformesProps) {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshInformes = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const [grupos, setGrupos] = useState<{ id_grupo: number; nombre: string }[]>([]);

  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        const res = await fetch('/api/grupos');
        if (!res.ok) throw new Error('Failed to fetch groups');
        const data = await res.json();
        setGrupos(data.map((row: any) => ({
          id_grupo: row.id_grupo,
          nombre: row.nombre_grupo || row.nombre
        })));
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    fetchGrupos();
  }, []);

  useEffect(() => {
    const fetchInformes = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (filtros.año) queryParams.append('año', filtros.año.toString());
        if (filtros.mes) queryParams.append('mes', filtros.mes);
        if (filtros.rol) queryParams.append('rol', filtros.rol);
        if (filtros.grupo) queryParams.append('grupo', filtros.grupo);

        const res = await fetch(`/api/informe?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Error fetching informes');
        const data = await res.json();
        setInformes(data.map((row: any) => ({
          id_informe: row.id_informe,
          fecha_registro: row.fecha_registro,
          horas: row.horas,
          cursos: row.cursos,
          año: row.año,
          mes: row.mes,
          participacion: Boolean(row.participacion),
          nombre: row.nombre,
          apellido: row.apellido,
          roles: row.roles || '',
          nombre_grupo: row.grupo_nombre || 'Sin grupo',
          trabajo_como_auxiliar: Boolean(row.trabajo_como_auxiliar),
          notas: row.notas
        })));
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInformes();
  }, [filtros, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EstadisticasInformes informes={informes} />
      {/* Filtros Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-balance">
          Filtros de Búsqueda
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Año
            </label>
            <select
              value={filtros.año}
              onChange={(e) => onFiltrosChange({ ...filtros, año: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {[...Array(5)].map((_, i) => {
                const año = new Date().getFullYear() - i;
                return (
                  <option key={año} value={año}>
                    {año}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mes
            </label>
            <select
              value={filtros.mes}
              onChange={(e) => onFiltrosChange({ ...filtros, mes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Todos los meses</option>
              {meses.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rol
            </label>
            <select
              value={filtros.rol}
              onChange={(e) => onFiltrosChange({ ...filtros, rol: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Todos los roles</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Grupo
            </label>
            <select
              value={filtros.grupo}
              onChange={(e) => onFiltrosChange({ ...filtros, grupo: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Todos los grupos</option>
              {grupos.map((grupo) => (
                <option key={grupo.id_grupo} value={grupo.id_grupo}>
                  {grupo.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Informes List */}
      <div className="space-y-4">
        {informes.map((informe) => (
          <InformeCard 
            key={informe.id_informe} 
            informe={informe} 
            onUpdate={refreshInformes}
            onDelete={refreshInformes}
          />
        ))}
      </div>

      {/* Empty State */}
      {informes.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg aria-hidden="true" className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-balance">No hay informes</h3>
          <p className="text-gray-600">No se encontraron informes con los filtros seleccionados.</p>
        </div>
      )}
    </div>
  );
} 