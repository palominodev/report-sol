import Link from 'next/link';
import { getWeeks } from '@/lib/presentation/weeks';
import WeekEstadoBadge from './WeekEstadoBadge';

export const dynamic = 'force-dynamic';

export default async function AsignacionesPage() {
  const weeks = await getWeeks();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Asignaciones de la reunión</h1>
              <p className="mt-1 text-sm text-slate-600">
                Reunión Vida y Ministerio — genera, revisa y confirma el programa semanal
              </p>
            </div>
            <nav aria-label="Navegación" className="flex gap-2">
              <Link
                href="/asignaciones"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Semanas
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Semanas</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {weeks.length} semana{weeks.length !== 1 ? 's' : ''} cargada{weeks.length !== 1 ? 's' : ''}
            </p>
          </div>

          {weeks.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-slate-500">No hay semanas cargadas todavía.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {weeks.map((week) => (
                <li key={week.id_week}>
                  <Link
                    href={`/asignaciones/${week.id_week}`}
                    className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{week.semana}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {week.fecha_inicio} — {week.fecha_fin}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <WeekEstadoBadge estado={week.estado} />
                      <svg aria-hidden="true" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}