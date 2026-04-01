interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number | null;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const COLOR_MAP = {
  blue: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    valueBg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
  },
  green: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    valueBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
  },
  purple: {
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    valueBg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
  },
  orange: {
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
    valueBg: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
  },
};

function TrendArrow({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold">
        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
        +{trend}
      </span>
    );
  }

  if (trend < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 text-xs font-semibold">
        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
        {trend}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-gray-400 text-xs font-medium">
      — sin cambio
    </span>
  );
}

export default function StatCard({ title, value, subtitle, trend, icon, color }: StatCardProps) {
  const colors = COLOR_MAP[color];

  return (
    <div className={`${colors.valueBg} rounded-xl border border-gray-100 p-5 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
          <span className={colors.iconText}>{icon}</span>
        </div>
        {trend !== undefined && trend !== null && <TrendArrow trend={trend} />}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-0.5">{title}</div>
      {subtitle && (
        <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
      )}
    </div>
  );
}
