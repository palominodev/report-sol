import type { MonthEntry, ServiceRole } from '@/core/domain/PublisherStats';

const ROLE_LABELS: Record<ServiceRole, { label: string; classes: string }> = {
  precursor_auxiliar: {
    label: 'Precursor Auxiliar',
    classes: 'bg-amber-100 text-amber-700',
  },
  precursor_regular: {
    label: 'Precursor Regular',
    classes: 'bg-indigo-100 text-indigo-700',
  },
  publicador: {
    label: 'Publicador',
    classes: 'bg-gray-100 text-gray-600',
  },
};

function TrendCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-gray-300">—</span>;
  }
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
        +{value}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
        {value}
      </span>
    );
  }
  return <span className="text-gray-400">=</span>;
}

export default function ParticipationTable({ history }: { history: MonthEntry[] }) {
  // Show most recent first
  const reversed = [...history].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Período
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Participó
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Horas
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Tendencia
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Cursos
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Rol de Servicio
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {reversed.map((entry, index) => {
            const roleConfig = ROLE_LABELS[entry.serviceRole];
            return (
              <tr
                key={`${entry.mes}-${entry.año}-${index}`}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-semibold text-gray-900 text-sm">
                    {entry.mes}
                  </span>
                  <span className="text-gray-400 text-sm ml-1">{entry.año}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {entry.participacion ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center bg-emerald-100 rounded-full">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : (
                    <span className="inline-flex w-6 h-6 items-center justify-center bg-red-100 rounded-full">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-gray-900">
                    {entry.horas ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  <TrendCell value={entry.horasTrend} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-gray-900">
                    {entry.cursos}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleConfig.classes}`}>
                    {roleConfig.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {reversed.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No hay informes registrados</p>
          <p className="text-gray-400 text-sm mt-1">Los informes aparecerán aquí cuando se registren.</p>
        </div>
      )}
    </div>
  );
}
