'use client';

import StatCard from '@/components/stats/StatCard';
import type { DashboardStats, KpiData } from '@/core/domain/dashboard/DashboardStats';

interface DashboardKPIsProps {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
}

const KPI_CONFIG: {
  color: 'blue' | 'green' | 'purple' | 'orange';
  icon: React.ReactNode;
}[] = [
  {
    color: 'blue',
    icon: (
      <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    color: 'green',
    icon: (
      <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    color: 'purple',
    icon: (
      <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    color: 'orange',
    icon: (
      <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

const DEFAULT_LABELS = [
  'Total Horas',
  'Total Cursos',
  'Tasa de Participación',
  'Publicadores Activos',
];

function calculateTrend(valor: number, valorPrevio: number): number | null {
  if (valorPrevio === 0 && valor === 0) return null;
  if (valorPrevio === 0) return 100;
  return Math.round(((valor - valorPrevio) / valorPrevio) * 100);
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="w-10 h-4 bg-gray-200 rounded" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-28" />
    </div>
  );
}

export default function DashboardKPIs({ stats, loading, error }: DashboardKPIsProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-5 mb-6">
        <p className="text-red-600 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const kpis: KpiData[] = stats?.kpis ?? [];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {KPI_CONFIG.map((config, index) => {
        const kpi = kpis[index] ?? {
          label: DEFAULT_LABELS[index],
          valor: 0,
          unidad: '',
          tendencia: 'no-data' as const,
          valorPrevio: 0,
        };

        const trend = calculateTrend(kpi.valor, kpi.valorPrevio);
        const value = `${kpi.valor} ${kpi.unidad}`.trim();

        return (
          <StatCard
            key={kpi.label}
            title={kpi.label}
            value={value}
            trend={trend}
            icon={config.icon}
            color={config.color}
          />
        );
      })}
    </div>
  );
}
