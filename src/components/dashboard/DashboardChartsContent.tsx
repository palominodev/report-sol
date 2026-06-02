'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  Label,
} from 'recharts';
import type {
  DashboardStats,
  MonthlyTrend,
  GroupComparison,
  ParticipationBreakdown,
} from '@/core/domain/dashboard/DashboardStats';

interface DashboardChartsContentProps {
  stats: DashboardStats | null;
}

const GROUP_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

const PARTICIPATION_COLORS: Record<string, string> = {
  regular: '#10b981',
  auxiliar: '#f59e0b',
  mixto: '#3b82f6',
};

function MonthlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as MonthlyTrend | undefined;

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
        {label}
      </p>
      <div className="flex items-center gap-2 text-sm">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: '#3b82f6' }}
        />
        <span className="text-gray-600 dark:text-gray-400">Horas:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {data?.horas ?? 0}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm mt-1">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: '#10b981' }}
        />
        <span className="text-gray-600 dark:text-gray-400">Cursos:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {data?.cursos ?? 0}
        </span>
      </div>
    </div>
  );
}

function GroupTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as GroupComparison | undefined;
  if (!data) return null;

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
        {data.grupo}
      </p>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Horas:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {data.horas}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm mt-1">
        <span className="text-gray-600 dark:text-gray-400">Cursos:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {data.cursos}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm mt-1">
        <span className="text-gray-600 dark:text-gray-400">Participación:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {data.porcentajeParticipacion}%
        </span>
      </div>
    </div>
  );
}

function ParticipationTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as ParticipationBreakdown | undefined;
  if (!data) return null;

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 capitalize">
        {data.tipo}
      </p>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Cantidad:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {data.cantidad}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm mt-1">
        <span className="text-gray-600 dark:text-gray-400">Porcentaje:</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {data.porcentaje}%
        </span>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

function MonthlyHoursChart({ data }: { data: MonthlyTrend[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 text-balance">
          Tendencia de Horas Mensuales
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Evolución de horas reportadas por mes
        </p>
        <EmptyState message="Sin datos disponibles" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 text-balance">
        Tendencia de Horas Mensuales
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Evolución de horas reportadas por mes
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<MonthlyTooltip />} />
          <Area
            type="monotone"
            dataKey="horas"
            name="Horas"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#monthlyGradient)"
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function GroupComparisonChart({ data }: { data: GroupComparison[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 text-balance">
          Comparación por Grupo
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Total de horas por grupo de predicación
        </p>
        <EmptyState message="Sin datos de grupos" />
      </div>
    );
  }

  const chartData = data.map((g) => ({
    ...g,
    grupoLabel: g.grupo.length > 15 ? g.grupo.slice(0, 15) + '...' : g.grupo,
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 text-balance">
        Comparación por Grupo
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Total de horas por grupo de predicación
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="grupoLabel"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<GroupTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="horas" name="Horas" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${entry.grupo}`} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ParticipationChart({ data }: { data: ParticipationBreakdown[] }) {
  if (data.length === 0 || data.every((d) => d.cantidad === 0)) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 text-balance">
          Distribución de Participación
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Publicadores por categoría de servicio
        </p>
        <EmptyState message="Sin datos de participación" />
      </div>
    );
  }

  const totalPublishers = data.reduce((sum, d) => sum + d.cantidad, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 text-balance">
        Distribución de Participación
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Publicadores por categoría de servicio
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Tooltip content={<ParticipationTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          />
          <Pie
            data={data}
            dataKey="cantidad"
            nameKey="tipo"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            cx="50%"
            cy="45%"
          >
            {data.map((entry) => (
              <Cell
                key={entry.tipo}
                fill={PARTICIPATION_COLORS[entry.tipo] ?? '#9ca3af'}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
            <Label
              content={(props: unknown) => {
                const viewBox = (props as any)?.viewBox;
                if (!viewBox || typeof viewBox.cx !== 'number' || typeof viewBox.cy !== 'number') {
                  return null;
                }
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      dy="-0.4em"
                      fontSize="13"
                      fill="#6b7280"
                    >
                      Total
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      dy="1.3em"
                      fontSize="20"
                      fontWeight="700"
                      fill="#111827"
                    >
                      {totalPublishers}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardChartsContent({ stats }: DashboardChartsContentProps) {
  const monthlyTrends = stats?.monthlyTrends ?? [];
  const groupComparisons = stats?.groupComparisons ?? [];
  const participationBreakdown = stats?.participationBreakdown ?? [];

  return (
    <div className="space-y-6 mb-6">
      <MonthlyHoursChart data={monthlyTrends} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupComparisonChart data={groupComparisons} />
        <ParticipationChart data={participationBreakdown} />
      </div>
    </div>
  );
}
