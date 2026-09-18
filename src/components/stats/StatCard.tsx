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
    iconBg: 'bg-nav',
    iconText: 'text-brand-light',
    valueBg: 'bg-surface',
  },
  green: {
    iconBg: 'bg-nav',
    iconText: 'text-brand-mid',
    valueBg: 'bg-surface',
  },
  purple: {
    iconBg: 'bg-nav',
    iconText: 'text-brand-pale',
    valueBg: 'bg-surface',
  },
  orange: {
    iconBg: 'bg-nav',
    iconText: 'text-ink',
    valueBg: 'bg-surface',
  },
};

function TrendArrow({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-brand-light text-xs font-semibold">
        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
        +{trend}
      </span>
    );
  }

  if (trend < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-danger-light text-xs font-semibold">
        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
        {trend}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-ink-muted text-xs font-medium">
      — sin cambio
    </span>
  );
}

export default function StatCard({ title, value, subtitle, trend, icon, color }: StatCardProps) {
  const colors = COLOR_MAP[color];

  return (
    <div className={`${colors.valueBg} border border-line p-5 transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${colors.iconBg} flex items-center justify-center`}>
          <span className={colors.iconText}>{icon}</span>
        </div>
        {trend !== undefined && trend !== null && <TrendArrow trend={trend} />}
      </div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">{title}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-ink-muted">{subtitle}</div>
      )}
    </div>
  );
}
