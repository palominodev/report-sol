import Link from 'next/link';
import { getWeeks } from '@/lib/presentation/weeks';
import { weekNextStep } from '@/lib/presentation/status';
import { groupWeeksByPriority } from '@/lib/presentation/groupWeeks';
import { checkGuideUpdate, getSyncState } from '@/infrastructure/scraper/sync-service';
import type { WeekState } from '@/domain/entities/presentation/enums';
import type { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import WeekEstadoBadge from './WeekEstadoBadge';
import SyncGuideBanner from './SyncGuideBanner';
import { requireAccount } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

const focusRing =
  'focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30';

const SUMMARY: { estado: WeekState; label: string }[] = [
  { estado: 'no_generada', label: 'Sin generar' },
  { estado: 'borrador', label: 'En borrador' },
  { estado: 'confirmada', label: 'Confirmadas' },
];

function WeekRow({ week }: { week: MeetingWeek }) {
  return (
    <li>
      <Link
        href={`/asignaciones/${week.id_week}`}
        className={`flex min-h-14 flex-col gap-2 px-5 py-4 transition-colors hover:bg-nav motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between ${focusRing}`}
      >
        <div>
          <div className="font-semibold text-brand-light">{week.semana}</div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {week.fecha_inicio} — {week.fecha_fin}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-muted">{weekNextStep(week.estado)}</span>
          <WeekEstadoBadge estado={week.estado} />
          <svg aria-hidden="true" className="h-4 w-4 text-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </li>
  );
}

export default async function AsignacionesPage() {
  await requireAccount();
  const [weeks, syncState] = await Promise.all([
    getWeeks(),
    checkGuideUpdate().catch(async () => {
      const state = await getSyncState().catch(() => ({
        latestLoaded: null,
        latestPublished: null,
        lastCheckedAt: null,
      }));
      return {
        hasNewer: false,
        latestLoaded: state.latestLoaded,
        latestPublished: state.latestPublished,
        lastCheckedAt: state.lastCheckedAt,
      };
    }),
  ]);

  const countByEstado = (estado: WeekState) => weeks.filter((w) => w.estado === estado).length;
  const { pending, confirmed } = groupWeeksByPriority(weeks);

  return (
    <div className="min-h-screen bg-page font-[family-name:Helvetica,Arial,sans-serif] text-ink">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <header className="border border-line bg-surface px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand">
                <svg aria-hidden="true" className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight text-ink">Asignaciones de la reunión</h1>
                <p className="text-sm text-ink-muted">
                  Vida y Ministerio — genera, revisa y confirma el programa semanal
                </p>
              </div>
            </div>
            <nav aria-label="Navegación">
              <Link
                href="/dashboard"
                className={`inline-flex cursor-pointer items-center justify-center border border-line bg-transparent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-nav motion-reduce:transition-none ${focusRing}`}
              >
                Ir al dashboard
              </Link>
            </nav>
          </div>
        </header>

        <SyncGuideBanner initialState={syncState} />

        {weeks.length > 0 && (
          <dl aria-label="Resumen de semanas" className="grid grid-cols-3 gap-px border border-line bg-line">
            {SUMMARY.map(({ estado, label }) => (
              <div key={estado} className="bg-surface px-4 py-3 text-center">
                <dd className="text-2xl font-bold text-ink">{countByEstado(estado)}</dd>
                <dt className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">{label}</dt>
              </div>
            ))}
          </dl>
        )}

        {weeks.length === 0 ? (
          <section className="border border-line bg-surface px-5 py-14 text-center">
            <p className="font-semibold text-ink">No hay semanas cargadas todavía.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Usá «Sincronizar Guía» arriba para traer el programa desde jw.org.
            </p>
          </section>
        ) : (
          <>
            <section aria-labelledby="pendientes-titulo" className="overflow-hidden border border-line bg-surface">
              <div className="border-b border-line px-5 py-4">
                <h2 id="pendientes-titulo" className="text-lg font-semibold text-ink">
                  Pendientes ({pending.length})
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">Semanas que todavía necesitan tu atención</p>
              </div>
              {pending.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm font-semibold text-emerald-300">
                  Todo al día: no hay semanas pendientes.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {pending.map((week) => (
                    <WeekRow key={week.id_week} week={week} />
                  ))}
                </ul>
              )}
            </section>

            {confirmed.length > 0 && (
              <details open={pending.length === 0} className="group border border-line bg-surface">
                <summary
                  className={`flex min-h-11 cursor-pointer list-none items-center justify-between px-5 py-3 text-lg font-semibold text-ink transition-colors hover:bg-nav motion-reduce:transition-none [&::-webkit-details-marker]:hidden ${focusRing}`}
                >
                  <span>Confirmadas ({confirmed.length})</span>
                  <svg aria-hidden="true" className="h-4 w-4 text-icon transition-transform group-open:rotate-90 motion-reduce:transition-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {confirmed.map((week) => (
                    <WeekRow key={week.id_week} week={week} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
