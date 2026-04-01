import Link from 'next/link';
import { TursoInformeRepository } from '@/infrastructure/persistence/turso-informe.repository';
import { GetPublisherStatsUseCase } from '@/core/application/use-cases/GetPublisherStatsUseCase';
import StatusBadge from '@/components/stats/StatusBadge';
import StatCard from '@/components/stats/StatCard';
import ParticipationTable from '@/components/stats/ParticipationTable';
import StatsCharts from '@/components/stats/StatsCharts';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Estadísticas del Publicador — Report Sol',
  description: 'Historial de participación y estadísticas detalladas por publicador',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublisherStatsPage({ params }: PageProps) {
  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId) || userId <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-balance">ID Inválido</h1>
          <p className="text-gray-600">El ID del publicador proporcionado no es válido.</p>
          <Link href="/dashboard/publicadores" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Volver a publicadores
          </Link>
        </div>
      </div>
    );
  }

  // Dependency injection: wire infrastructure → use case
  const informeRepository = new TursoInformeRepository();
  const getStatsUseCase = new GetPublisherStatsUseCase(informeRepository);

  let stats;
  try {
    stats = await getStatsUseCase.execute(userId);
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-balance">Publicador no encontrado</h1>
          <p className="text-gray-600">
            {error instanceof Error ? error.message : 'Ocurrió un error al cargar las estadísticas.'}
          </p>
          <Link href="/dashboard/publicadores" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Volver a publicadores
          </Link>
        </div>
      </div>
    );
  }

  // Get the latest month entry for trend display on cards
  const latestEntry = stats.history.length > 0 ? stats.history[stats.history.length - 1] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Back navigation */}
        <Link
          href="/dashboard/publicadores"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Publicadores
        </Link>

        {/* Header: Publisher identity + status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">
                  {stats.nombre.charAt(0)}{stats.apellido.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 text-balance">
                  {stats.nombre} {stats.apellido}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {stats.grupo}
                  {stats.roles.length > 0 && (
                    <span className="ml-2">
                      · {stats.roles.join(', ')}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <StatusBadge status={stats.status} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Promedio de Horas"
            value={stats.averages.horas}
            subtitle="Últimos 6 meses"
            trend={latestEntry?.horasTrend}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Promedio de Cursos"
            value={stats.averages.cursos}
            subtitle="Últimos 6 meses"
            trend={latestEntry?.cursosTrend}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />
          <StatCard
            title="Tasa de Participación"
            value={`${stats.averages.participationRate}%`}
            subtitle="Últimos 6 meses"
            color="purple"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <StatCard
            title="Meses como Precursor"
            value={stats.pioneerMonths.length}
            subtitle="Total registrado"
            color="orange"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        </div>

        {/* Charts Section */}
        <div className="mb-6">
          <StatsCharts history={stats.history} />
        </div>

        {/* Pioneer Months Detail */}
        {stats.pioneerMonths.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-balance">
              Registro de Precursorado
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.pioneerMonths.map((pm, index) => (
                <span
                  key={`${pm.mes}-${pm.año}-${index}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    pm.role === 'precursor_auxiliar'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {pm.mes} {pm.año} — {pm.role === 'precursor_auxiliar' ? 'Auxiliar' : 'Regular'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 text-balance">
              Historial de Participación
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {stats.history.length} {stats.history.length === 1 ? 'mes registrado' : 'meses registrados'}
            </p>
          </div>
          <ParticipationTable history={stats.history} />
        </div>
      </div>
    </div>
  );
}
