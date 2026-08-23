import { WeekState } from '@/domain/entities/presentation/enums';
import { weekEstadoMeta } from '@/lib/presentation/status';

export default function WeekEstadoBadge({ estado }: { estado: WeekState }) {
  const meta = weekEstadoMeta(estado);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}