'use client';
import { useState, useEffect } from 'react';
import ListaInformes from '@/components/ListaInformes';
import Link from 'next/link';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import type { DashboardStats } from '@/core/domain/dashboard/DashboardStats';

interface Filtros {
  año: number;
  mes: string;
  rol: string;
  grupo: string;
}

const meses = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

export default function DashboardPage() {
  const [filtros, setFiltros] = useState<Filtros>({
    año: new Date().getFullYear(),
    mes: '',
    rol: '',
    grupo: ''
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    setStatsLoading(true);
    setStatsError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('año', filtros.año.toString());
        if (filtros.mes) params.set('mes', filtros.mes);
        if (filtros.rol) params.set('rol', filtros.rol);
        if (filtros.grupo) params.set('grupo', filtros.grupo);

        const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setStatsError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filtros]);

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.año) params.set('año', filtros.año.toString());
      if (filtros.mes) params.set('mes', filtros.mes);
      if (filtros.rol) params.set('rol', filtros.rol);
      if (filtros.grupo) params.set('grupo', filtros.grupo);

      const response = await fetch(`/api/informe/export?${params.toString()}`);
      if (!response.ok) throw new Error('Error al descargar');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const mesLabel = filtros.mes ? `_${filtros.mes}` : '';
      a.download = `informe_actividades_${filtros.año}${mesLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Error al descargar el informe');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg aria-hidden="true" className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1 text-balance">
                  Dashboard
                </h1>
                <p className="text-gray-600 text-lg">
                  Panel de control y gestión de informes
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={'/dashboard/publicadores'}
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
              >
                <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Lista de Grupos
              </Link>
              <Link
                href={'/usuario/nuevo'}
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
              >
                <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear Publicador
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <DashboardKPIs stats={stats} loading={statsLoading} error={statsError} />

        {/* Charts Placeholder */}
        <div id="dashboard-charts-placeholder" className="mb-6" />

        {/* Content Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 text-balance">
              Informes Recientes
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Visualiza y gestiona los informes de actividad de los publicadores
            </p>

            {/* Filtros y botón de descarga */}
            <div className="flex flex-wrap items-end gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Año
                </label>
                <select
                  value={filtros.año}
                  onChange={(e) => setFiltros({ ...filtros, año: parseInt(e.target.value) })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Mes
                </label>
                <select
                  value={filtros.mes}
                  onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los meses</option>
                  {meses.map((mes) => (
                    <option key={mes} value={mes}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDownload}
                className="inline-flex items-center justify-center px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
              >
                <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar Informe
              </button>
            </div>
          </div>
          <div className="p-6">
            <ListaInformes filtros={filtros} onFiltrosChange={setFiltros} />
          </div>
        </div>
      </div>
    </div>
  );
}