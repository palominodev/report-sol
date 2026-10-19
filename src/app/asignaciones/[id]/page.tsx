import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWeekDetail, getAssignableUsers, getAssignmentHistory } from '@/lib/presentation/weeks';
import {
  assignmentEstadoLabel,
  weekEstadoMeta,
  meetingSectionLabel,
  presentationTypeLabel,
  salaLabel,
  SALA_LABELS,
} from '@/lib/presentation/status';
import { Sala } from '@/domain/entities/presentation/enums';
import WeekActions from './WeekActions';
import OverrideControl, { OverrideUser } from './OverrideControl';
import SalaControl from './SalaControl';
import AssignmentHistory from './AssignmentHistory';
import type { AssignmentHistoryEntry } from '@/core/domain/presentations/AssignmentHistory';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface AssignmentBySlot {
  [key: string]: { id_usuario: number | null; estado: string | null };
}

export default async function AsignacionDetailPage(props: PageProps) {
  const params = await props.params;
  const idWeek = Number(params.id);
  if (!Number.isInteger(idWeek) || idWeek <= 0) notFound();

  // Room A is the default; each room view excludes parts without a sala.
  const searchParams = await props.searchParams;
  const salaParam = typeof searchParams.sala === 'string' ? searchParams.sala : undefined;
  const salaFilter: Sala = salaParam === 'B' ? 'B' : 'A';

  const [{ week, parts, assignments }, users, assignmentHistory] = await Promise.all([
    getWeekDetail(idWeek),
    getAssignableUsers(),
    getAssignmentHistory(idWeek),
  ]);
  const historyByUser = new Map<number, AssignmentHistoryEntry[]>();
  for (const entry of assignmentHistory) {
    const entries = historyByUser.get(entry.id_usuario) ?? [];
    entries.push(entry);
    historyByUser.set(entry.id_usuario, entries);
  }

  // Class instances cannot cross to Client Components — pass plain objects.
  const plainUsers: OverrideUser[] = users.map((u) => ({
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    apellido: u.apellido,
    genero: u.genero,
    assignmentHistory: historyByUser.get(u.id_usuario) ?? [],
  }));

  const usersById = new Map<number, OverrideUser>(plainUsers.map((u) => [u.id_usuario, u]));
  const userFullName = (id: number) => {
    const u = usersById.get(id);
    return u ? `${u.nombre} ${u.apellido}` : null;
  };

  // state = `${id_part}:${rol}`
  const assignmentsBySlot: AssignmentBySlot = {};
  for (const a of assignments) {
    assignmentsBySlot[`${a.id_part}:${a.rol}`] = {
      id_usuario: a.id_usuario,
      estado: a.estado,
    };
  }

  const isConfirmed = week.estado === 'confirmada';
  const hasAssignments = assignments.length > 0;
  // Primitive across the RSC boundary: how many parts still have no sala (drives the policy modal).
  // Deliberately computed on the UNFILTERED parts: switching tabs must not change the ask.
  const nullSalaParts = parts.filter((p) => p.sala === null).length;
  // Server-side room filter, applied BEFORE per-section grouping (zero client state).
  const visibleParts = parts.filter((p) => p.sala === salaFilter);

  const renderSlot = (partId: number, rol: 'presentador' | 'companero', label: string) => {
    const slot = assignmentsBySlot[`${partId}:${rol}`];
    return (
      <div className="min-w-0 space-y-3 border border-line bg-surface p-4">
        <div>
          <div className="text-xs font-medium text-ink-muted">{label}</div>
          {slot?.id_usuario ? (
            <div className="font-semibold text-ink">{userFullName(slot.id_usuario)}</div>
          ) : (
            <div className="text-sm italic text-ink-muted">Sin asignar</div>
          )}
          {slot?.estado && (
            <div className="mt-1 text-xs text-ink-muted">
              {assignmentEstadoLabel(slot.estado as 'draft' | 'confirmed' | 'manual')}
            </div>
          )}
        </div>
        {slot?.id_usuario && (
          <AssignmentHistory history={usersById.get(slot.id_usuario)?.assignmentHistory ?? []} idWeek={week.id_week} />
        )}
        <OverrideControl
          idWeek={week.id_week}
          idPart={partId}
          rol={rol}
          currentIdUsuario={slot?.id_usuario ?? null}
          users={plainUsers}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-page font-[family-name:Helvetica,Arial,sans-serif] text-ink scheme-dark">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <header className="border border-line bg-surface p-6">
          <nav aria-label="Navegación" className="mb-4">
            <Link href="/asignaciones" className="text-sm font-medium text-brand-light hover:underline">
              ← Volver a semanas
            </Link>
          </nav>
          <div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-ink">{week.semana}</h1>
                <span className="border border-line bg-nav px-2.5 py-0.5 text-xs font-medium text-ink">{weekEstadoMeta(week.estado).label}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {week.fecha_inicio} — {week.fecha_fin}
              </p>
            </div>
            <WeekActions
              idWeek={week.id_week}
              weekLabel={week.semana}
              hasAssignments={hasAssignments}
              isConfirmed={isConfirmed}
              nullSalaParts={nullSalaParts}
            />
          </div>
        </header>

        {parts.length === 0 ? (
          <div className="border border-line bg-surface p-10 text-center">
            <p className="text-ink-muted">
              Esta semana no tiene partes cargadas todavía (se cargan con la sincronización de la guía).
            </p>
          </div>
        ) : (
          <>
            {/* Link-based room tabs preserve URL navigation and native keyboard access. */}
            <nav aria-label="Salas" className="flex border-b border-line">
              {([
                { sala: 'A' as const, label: SALA_LABELS.A },
                { sala: 'B' as const, label: SALA_LABELS.B },
              ]).map(({ sala, label }) => {
                const active = salaFilter === sala;
                return (
                  <Link
                    key={label}
                    href={`/asignaciones/${week.id_week}?sala=${sala}`}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        ? '-mb-px border-b-2 border-brand-light px-4 py-3 text-sm font-semibold text-brand-light transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light'
                        : '-mb-px border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-brand-light hover:bg-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light'
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {visibleParts.length === 0 ? (
              <div className="border border-line bg-surface p-10 text-center">
                <p className="text-ink-muted">Esta sala no tiene partes esta semana.</p>
              </div>
            ) : (
              (['TESOROS_DE_LA_BIBLIA', 'SEAMOS_MEJORES_MAESTROS'] as const).map((seccion) => {
                const sectionParts = visibleParts
                  .filter((p) => p.seccion === seccion)
                  .sort((a, b) => a.orden - b.orden);
                if (sectionParts.length === 0) return null;
                return (
                  <section key={seccion} className="overflow-hidden border border-line bg-surface">
                    <div className="border-b border-line bg-page px-6 py-3">
                      <h2 className="text-sm font-bold tracking-wide text-ink-muted">
                        {meetingSectionLabel(seccion)}
                      </h2>
                    </div>
                    <ul className="divide-y divide-line">
                      {sectionParts.map((part) => {
                        const salaBadge = salaLabel(part.sala);
                        return (
                        <li key={part.id_part} className="flex flex-col gap-4 px-6 py-5">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-ink">
                              {presentationTypeLabel(part.tipo)}
                            </span>
                            <span className="bg-nav px-2 py-0.5 text-xs font-medium text-ink-muted">
                              {part.duracion_min} min
                            </span>
                            {salaBadge ? (
                              <span className="bg-brand-highlight px-2 py-0.5 text-xs font-medium text-brand-light">
                                {salaBadge}
                              </span>
                            ) : null}
                            {/* Primitives only across the RSC boundary (class rule, L30). */}
                            <SalaControl idPart={part.id_part} current={part.sala} />
                          </div>
                          {part.requiresCompanero() ? (
                            <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2">
                              {renderSlot(part.id_part, 'presentador', 'Presentador')}
                              {renderSlot(part.id_part, 'companero', 'Compañero')}
                            </div>
                          ) : (
                            <div className="border-t border-line pt-4">
                              {renderSlot(part.id_part, 'presentador', 'Presentador')}
                            </div>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })
            )}
          </>
        )}

        {isConfirmed && (
          <div className="border border-brand-light bg-brand-highlight px-4 py-3 text-sm text-ink">
            Esta semana está confirmada. Los cambios manuales siguen permitiéndose y se reflejan en el
            programa imprimible.
          </div>
        )}
      </div>
    </div>
  );
}