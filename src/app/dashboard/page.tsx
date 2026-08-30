'use client';
import { useState, useEffect, Suspense } from 'react';
import ListaInformes from '@/components/ListaInformes';
import Link from 'next/link';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardChartsSkeleton from '@/components/dashboard/DashboardChartsSkeleton';
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

const roles = [
  { id: 'publicador', label: 'Publicador' },
  { id: 'auxiliar', label: 'Auxiliar' },
  { id: 'regular', label: 'Regular' }
];

const selectClasses =
  'h-9 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 ' +
  'transition-colors motion-reduce:transition-none ' +
  'focus:outline-none focus-visible:border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-800/30';

const labelClasses = 'mb-1 block text-xs font-medium text-slate-500';

export default function DashboardPage() {
  const [filtros, setFiltros] = useState<Filtros>({
    año: new Date().getFullYear(),
    mes: '',
    rol: '',
    grupo: ''
  });

  const [grupos, setGrupos] = useState<{ id_grupo: number; nombre: string }[]>([]);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {/* Header */}
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-800">
                <svg aria-hidden="true" className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight text-slate-900">
                  Dashboard
                </h1>
                <p className="text-sm text-slate-600">
                  Panel de control y gestión de informes
                </p>
              </div>
            </div>

            <nav aria-label="Acciones rápidas" className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={'/asignaciones'}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 motion-reduce:transition-none focus:outline-none focus-visible:border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-800/30"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Asignaciones
              </Link>
              <Link
                href={'/dashboard/publicadores'}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 motion-reduce:transition-none focus:outline-none focus-visible:border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-800/30"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Lista de Grupos
              </Link>
              <Link
                href={'/usuario/nuevo'}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-900 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-800/40"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear Publicador
              </Link>
            </nav>
          </div>
        </header>

        {/* Global filter toolbar */}
        <div role="group" aria-label="Filtros del dashboard" className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="filtro-anio" className={labelClasses}>
                Año
              </label>
              <select
                id="filtro-anio"
                value={filtros.año}
                onChange={(e) => setFiltros({ ...filtros, año: parseInt(e.target.value) })}
                className={selectClasses}
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
              <label htmlFor="filtro-mes" className={labelClasses}>
                Mes
              </label>
              <select
                id="filtro-mes"
                value={filtros.mes}
                onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
                className={selectClasses}
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
              <label htmlFor="filtro-rol" className={labelClasses}>
                Rol
              </label>
              <select
                id="filtro-rol"
                value={filtros.rol}
                onChange={(e) => setFiltros({ ...filtros, rol: e.target.value })}
                className={selectClasses}
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
              <label htmlFor="filtro-grupo" className={labelClasses}>
                Grupo
              </label>
              <select
                id="filtro-grupo"
                value={filtros.grupo}
                onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}
                className={selectClasses}
              >
                <option value="">Todos los grupos</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id_grupo} value={grupo.id_grupo}>
                    {grupo.nombre}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-800 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40 sm:ml-auto"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar Informe
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <DashboardKPIs stats={stats} loading={statsLoading} error={statsError} />

        {/* Charts */}
        <Suspense fallback={<DashboardChartsSkeleton />}>
          <DashboardCharts stats={stats} />
        </Suspense>

        {/* Reports Section */}
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Informes Recientes
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Visualiza y gestiona los informes de actividad de los publicadores
            </p>
          </div>
          <div className="p-5">
            <ListaInformes filtros={filtros} />
          </div>
        </section>
      </div>
    </div>
  );
}
