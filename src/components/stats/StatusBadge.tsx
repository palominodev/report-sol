import type { ActivityStatus } from '@/core/domain/PublisherStats';

const STATUS_CONFIG: Record<ActivityStatus, { label: string; bg: string; text: string; dot: string }> = {
  ACTIVO: {
    label: 'Activo',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  IRREGULAR: {
    label: 'Irregular',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  INACTIVO: {
    label: 'Inactivo',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

export default function StatusBadge({ status }: { status: ActivityStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}
