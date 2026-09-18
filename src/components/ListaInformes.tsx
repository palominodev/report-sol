'use client';

import { useState, useEffect, useCallback } from 'react';
import EstadisticasInformes from './EstadisticasInformes';
import InformeCard from './InformeCard';
import TablaInformes from './TablaInformes';

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
  /** Reports the number of fetched reports so the parent can show a result count */
  onCountChange?: (count: number) => void;
  /** Presentation mode for the reports */
  vista?: 'lista' | 'tabla';
}

export default function ListaInformes({ filtros, onCountChange, vista = 'lista' }: ListaInformesProps) {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshInformes = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // In table view the visible rows can differ from informes.length (local role filter)
  const handleVisibleCount = useCallback(
    (count: number) => {
      if (vista === 'tabla') onCountChange?.(count);
    },
    [vista, onCountChange],
  );

  useEffect(() => {
    // In table view TablaInformes reports the filtered count instead
    if (vista === 'tabla') return;
    onCountChange?.(informes.length);
  }, [informes, onCountChange, vista]);

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

      {/* Reports List / Table */}
      <div className="space-y-4">
        {vista === 'tabla' ? (
          <TablaInformes informes={informes} onRefresh={refreshInformes} onVisibleCountChange={handleVisibleCount} />
        ) : (
          informes.map((informe) => (
            <InformeCard
              key={informe.id_informe}
              informe={informe}
              onUpdate={refreshInformes}
              onDelete={refreshInformes}
            />
          ))
        )}
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