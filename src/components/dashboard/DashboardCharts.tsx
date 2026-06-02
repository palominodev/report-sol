'use client';

import dynamic from 'next/dynamic';
import DashboardChartsSkeleton from './DashboardChartsSkeleton';
import type { DashboardStats } from '@/core/domain/dashboard/DashboardStats';

const DashboardChartsContent = dynamic(
  () => import('./DashboardChartsContent'),
  { ssr: false, loading: () => <DashboardChartsSkeleton /> }
);

interface DashboardChartsProps {
  stats: DashboardStats | null;
}

export default function DashboardCharts({ stats }: DashboardChartsProps) {
  return <DashboardChartsContent stats={stats} />;
}
