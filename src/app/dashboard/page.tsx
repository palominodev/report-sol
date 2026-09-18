'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
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
  'h-11 cursor-pointer border border-line bg-surface px-3 text-sm text-ink ' +
  'transition-colors motion-reduce:transition-none ' +
  'focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30';

const labelClasses = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted';

export default function DashboardPage() {
  const [filtros, setFiltros] = useState<Filtros>({
    año: new Date().getFullYear(),
    mes: '',
    rol: '',
    grupo: ''
  });

  const [grupos, setGrupos] = useState<{ id_grupo: number; nombre: string }[]>([]);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  /** true once the default filter period (last registered informe) has been resolved */
  const [periodoListo, setPeriodoListo] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [informesCount, setInformesCount] = useState<number | null>(null);
  const handleCountChange = useCallback((count: number) => {
    setInformesCount(count);
  }, []);

  const [vista, setVista] = useState<'lista' | 'tabla'>('lista');

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
    const fetchPeriodoInicial = async () => {
      try {
        const res = await fetch('/api/informe/ultimo');
        if (res.ok) {
          const ultimo = await res.json();
          if (ultimo?.año && ultimo?.mes) {
            setFiltros((prev) => ({ ...prev, año: Number(ultimo.año), mes: ultimo.mes }));
          }
        }
      } catch (error) {
        console.error('Error al obtener el último período:', error);
      } finally {
        setPeriodoListo(true);
      }
    };

    fetchPeriodoInicial();
  }, []);

  useEffect(() => {
    if (!periodoListo) return;
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
  }, [filtros, periodoListo]);

  const handleDownload = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const params = new URLSearchParams();
      if (filtros.año) params.set('año', filtros.año.toString());
      if (filtros.mes) params.set('mes', filtros.mes);
      if (filtros.rol) params.set('rol', filtros.rol);
      if (filtros.grupo) params.set('grupo', filtros.grupo);

      const response = await fetch(`/api/informe/export?${params.toString()}`);
      if (!response.ok) throw new Error('Error al generar el archivo');
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
      setExportError('No se pudo generar el archivo. Verificá tu conexión e intentá de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros((prev) => ({ ...prev, mes: '', rol: '', grupo: '' }));
  };

  const hayFiltrosActivos = Boolean(filtros.mes || filtros.rol || filtros.grupo);

  return (
    <div className="min-h-screen bg-page font-[family-name:Helvetica,Arial,sans-serif] text-ink">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {/* Header */}
        <header className="border border-line bg-surface px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand">
                <svg aria-hidden="true" className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight text-ink">
                  Dashboard
                </h1>
                <p className="text-sm text-ink-muted">
                  Panel de control y gestión de informes
                </p>
              </div>
            </div>

            <nav aria-label="Acciones rápidas" className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={'/asignaciones'}
                className="inline-flex cursor-pointer items-center justify-center gap-2 border border-line bg-transparent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-nav motion-reduce:transition-none focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Asignaciones
              </Link>
              <Link
                href={'/dashboard/publicadores'}
                className="inline-flex cursor-pointer items-center justify-center gap-2 border border-line bg-transparent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-nav motion-reduce:transition-none focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Publicadores
              </Link>
              <Link
                href={'/usuario/nuevo'}
                className="inline-flex cursor-pointer items-center justify-center gap-2 bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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
        <div role="group" aria-label="Filtros del dashboard" className="border border-line bg-surface px-5 py-4">
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
                {Array.from(new Set([
                  filtros.año,
                  ...Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i),
                ])).sort((a, b) => b - a).map((año) => (
                  <option key={año} value={año}>
                    {año}
                  </option>
                ))}
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
              onClick={limpiarFiltros}
              disabled={!hayFiltrosActivos}
              className="inline-flex h-11 cursor-pointer items-center gap-1.5 px-2 text-sm font-semibold text-brand-light transition-colors hover:underline disabled:invisible motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              aria-busy={isExporting}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:ml-auto"
            >
              {isExporting ? (
                <svg aria-hidden="true" className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {isExporting ? 'Generando…' : 'Exportar Excel'}
            </button>
          </div>

          {exportError && (
            <div
              role="alert"
              className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-danger/50 bg-danger/10 px-4 py-3"
            >
              <p className="text-sm font-medium text-ink">{exportError}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="cursor-pointer border border-danger px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-danger hover:text-white motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <DashboardKPIs stats={stats} loading={statsLoading} error={statsError} />

        {/* Charts */}
        <Suspense fallback={<DashboardChartsSkeleton />}>
          <DashboardCharts stats={stats} />
        </Suspense>

        {/* Reports Section */}
        <section className="overflow-hidden border border-line bg-surface">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Informes Recientes
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                Visualiza y gestiona los informes de actividad de los publicadores
              </p>
            </div>
            <div className="flex items-center gap-3">
              {informesCount !== null && (
                <p aria-live="polite" className="text-sm font-semibold text-slate-700">
                  {informesCount} {informesCount === 1 ? 'informe' : 'informes'}
                </p>
              )}
              <div role="group" aria-label="Modo de vista" className="flex">
                <button
                  type="button"
                  onClick={() => setVista('lista')}
                  aria-pressed={vista === 'lista'}
                  aria-label="Vista de lista"
                  title="Vista de lista"
                  className={`flex h-8 w-9 cursor-pointer items-center justify-center border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 motion-reduce:transition-none ${
                    vista === 'lista'
                      ? 'border-line bg-nav text-brand-light'
                      : 'border-line bg-white text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setVista('tabla')}
                  aria-pressed={vista === 'tabla'}
                  aria-label="Vista de tabla"
                  title="Vista de tabla"
                  className={`-ml-px flex h-8 w-9 cursor-pointer items-center justify-center border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 motion-reduce:transition-none ${
                    vista === 'tabla'
                      ? 'border-line bg-nav text-brand-light'
                      : 'border-line bg-white text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h18v14H3V5zm0 5h18M9 5v14m6-14v14" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="p-5">
            {periodoListo && <ListaInformes filtros={filtros} onCountChange={handleCountChange} vista={vista} />}
          </div>
        </section>
      </div>
    </div>
  );
}
