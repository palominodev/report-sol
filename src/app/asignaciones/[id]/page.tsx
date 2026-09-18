import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWeekDetail, getAssignableUsers } from '@/lib/presentation/weeks';
import {
  assignmentEstadoLabel,
  meetingSectionLabel,
  presentationTypeLabel,
  salaLabel,
  SALA_LABELS,
} from '@/lib/presentation/status';
import { Sala } from '@/domain/entities/presentation/enums';
import WeekEstadoBadge from '../WeekEstadoBadge';
import GenerateButton from './GenerateButton';
import ConfirmButton from './ConfirmButton';
import OverrideControl, { OverrideUser } from './OverrideControl';
import SalaControl from './SalaControl';

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

  // View-only room filter: an unknown or absent value renders every room.
  const searchParams = await props.searchParams;
  const salaParam = typeof searchParams.sala === 'string' ? searchParams.sala : undefined;
  const salaFilter: Sala | null = salaParam === 'A' || salaParam === 'B' ? salaParam : null;

  const [{ week, parts, assignments }, users] = await Promise.all([
    getWeekDetail(idWeek),
    getAssignableUsers(),
  ]);

  // Class instances cannot cross to Client Components — pass plain objects.
  const plainUsers: OverrideUser[] = users.map((u) => ({
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    apellido: u.apellido,
    genero: u.genero,
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
  const visibleParts = salaFilter ? parts.filter((p) => p.sala === salaFilter) : parts;

  const renderSlot = (partId: number, rol: 'presentador' | 'companero', label: string) => {
    const slot = assignmentsBySlot[`${partId}:${rol}`];
    return (
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          {slot?.id_usuario ? (
            <div className="font-semibold text-slate-900">{userFullName(slot.id_usuario)}</div>
          ) : (
            <div className="text-sm italic text-slate-400">Sin asignar</div>
          )}
          {slot?.estado && (
            <div className="text-xs text-slate-400">
              {assignmentEstadoLabel(slot.estado as 'draft' | 'confirmed' | 'manual')}
            </div>
          )}
        </div>
        <OverrideControl
          idPart={partId}
          rol={rol}
          currentIdUsuario={slot?.id_usuario ?? null}
          users={plainUsers}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <nav aria-label="Navegación" className="mb-4">
            <Link href="/asignaciones" className="text-sm font-medium text-blue-800 hover:underline">
              ← Volver a semanas
            </Link>
          </nav>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{week.semana}</h1>
                <WeekEstadoBadge estado={week.estado} />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {week.fecha_inicio} — {week.fecha_fin}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                {!isConfirmed && (
                  <GenerateButton
                    idWeek={week.id_week}
                    label={hasAssignments ? 'Regenerar' : 'Generar'}
                    nullSalaParts={nullSalaParts}
                  />
                )}
                <Link
                  href={`/asignaciones/${week.id_week}/imprimir`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Ver programa imprimible
                </Link>
              </div>
              <ConfirmButton idWeek={week.id_week} />
            </div>
          </div>
        </header>

        {parts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">
              Esta semana no tiene partes cargadas todavía (se cargan con la sincronización de la guía).
            </p>
          </div>
        ) : (
          <>
            {/* View-only room tabs (Link-based, server-filtered; default renders all). */}
            <nav aria-label="Filtro de sala" className="flex flex-wrap gap-2">
              {([
                { sala: null, label: 'Todas' },
                { sala: 'A' as const, label: SALA_LABELS.A },
                { sala: 'B' as const, label: SALA_LABELS.B },
              ]).map(({ sala, label }) => {
                const active = salaFilter === sala;
                return (
                  <Link
                    key={label}
                    href={sala ? `/asignaciones/${week.id_week}?sala=${sala}` : `/asignaciones/${week.id_week}`}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        ? 'rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition-colors'
                        : 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50'
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {visibleParts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <p className="text-slate-500">Esta sala no tiene partes esta semana.</p>
              </div>
            ) : (
              (['TESOROS_DE_LA_BIBLIA', 'SEAMOS_MEJORES_MAESTROS'] as const).map((seccion) => {
                const sectionParts = visibleParts
                  .filter((p) => p.seccion === seccion)
                  .sort((a, b) => a.orden - b.orden);
                if (sectionParts.length === 0) return null;
                return (
                  <section key={seccion} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
                      <h2 className="text-sm font-bold tracking-wide text-slate-700">
                        {meetingSectionLabel(seccion)}
                      </h2>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {sectionParts.map((part) => {
                        const salaBadge = salaLabel(part.sala);
                        return (
                        <li key={part.id_part} className="flex flex-col gap-4 px-6 py-5">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-slate-900">
                              {presentationTypeLabel(part.tipo)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {part.duracion_min} min
                            </span>
                            {salaBadge ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {salaBadge}
                              </span>
                            ) : null}
                            {/* Primitives only across the RSC boundary (class rule, L30). */}
                            <SalaControl idPart={part.id_part} current={part.sala} />
                          </div>
                          {part.requiresCompanero() ? (
                            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                              {renderSlot(part.id_part, 'presentador', 'Presentador')}
                              {renderSlot(part.id_part, 'companero', 'Compañero')}
                            </div>
                          ) : (
                            <div className="border-t border-slate-100 pt-4">
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
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Esta semana está confirmada. Los cambios manuales siguen permitiéndose y se reflejan en el
            programa imprimible.
          </div>
        )}
      </div>
    </div>
  );
}