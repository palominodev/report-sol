import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWeekDetail, getAssignableUsers } from '@/lib/presentation/weeks';
import { buildPrintSections, UserNameResolver } from '@/lib/presentation/printProgram';
import { meetingSectionLabel, presentationTypeLabel, salaLabel, SALA_LABELS } from '@/lib/presentation/status';
import { PresentationType, Sala } from '@/domain/entities/presentation/enums';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AsignacionPrintPage(props: PageProps) {
  const params = await props.params;
  const idWeek = Number(params.id);
  if (!Number.isInteger(idWeek) || idWeek <= 0) notFound();

  // Per-room print: an unknown or absent value keeps the combined program.
  const searchParams = await props.searchParams;
  const salaParam = typeof searchParams.sala === 'string' ? searchParams.sala : undefined;
  const salaFilter: Sala | null = salaParam === 'A' || salaParam === 'B' ? salaParam : null;

  const [{ week, parts, assignments }, users] = await Promise.all([
    getWeekDetail(idWeek),
    getAssignableUsers(),
  ]);

  const namesById = new Map<number, string>(users.map((u) => [u.id_usuario, `${u.nombre} ${u.apellido}`]));
  const resolveName: UserNameResolver = (id) => namesById.get(id) ?? 'Sin asignar';

  // Caller-side filter (buildPrintSections' signature is unchanged by design):
  // the room header replaces the per-part badge, so a room-filtered program
  // prints one room's chronology instead of both interleaved.
  const visibleParts = salaFilter ? parts.filter((p) => p.sala === salaFilter) : parts;
  const sections = buildPrintSections(visibleParts, assignments, resolveName);

  const roomTabs: { sala: Sala | null; label: string }[] = [
    { sala: null, label: 'Todas' },
    { sala: 'A', label: SALA_LABELS.A },
    { sala: 'B', label: SALA_LABELS.B },
  ];
  const tabHref = (sala: Sala | null) =>
    sala ? `/asignaciones/${week.id_week}/imprimir?sala=${sala}` : `/asignaciones/${week.id_week}/imprimir`;

  return (
    <div className="min-h-screen bg-white">
      {/* Screen-only room switcher (print CSS hides it) */}
      <nav aria-label="Vista de sala" className="mx-auto flex max-w-3xl flex-wrap justify-end gap-2 px-6 pt-6 print:hidden">
        {roomTabs.map(({ sala, label }) => (
          <Link
            key={label}
            href={tabHref(sala)}
            aria-current={salaFilter === sala ? 'page' : undefined}
            className={
              salaFilter === sala
                ? 'rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition-colors'
                : 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50'
            }
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Print-only header */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8 border-b-2 border-black pb-6 text-center print:py-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Programa de la Reunión</h1>
          <p className="mt-1 text-base text-slate-700">Reunión Vida y Ministerio</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{week.semana}</p>
          {salaFilter ? (
            <p className="mt-1 text-sm font-semibold text-slate-800">{SALA_LABELS[salaFilter]}</p>
          ) : null}
        </header>

        {sections.length === 0 ? (
          <p className="text-center text-slate-500">
            Esta semana no tiene asignaciones confirmadas para imprimir.
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.seccion} className="mb-8">
              <h2 className="mb-4 border-b border-black py-2 text-center text-lg font-bold tracking-wide text-slate-900">
                {meetingSectionLabel(section.seccion)}
              </h2>
              <ul className="space-y-6">
                {section.parts.map((part) => {
                  // Redundant under a room filter: the header already names the room.
                  const sala = salaFilter ? null : salaLabel(part.sala);
                  return (
                  <li key={part.id_part} className="flex items-baseline justify-between gap-6">
                    <div>
                      <div className="text-left">
                        <span className="text-base font-semibold text-slate-900">
                          {presentationTypeLabel(part.tipo as PresentationType)}
                        </span>
                        <span className="ml-2 text-sm text-slate-500">({part.duracionMin} min)</span>
                        {sala ? <span className="ml-2 text-sm text-slate-500">· {sala}</span> : null}
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {part.presentador?.nombre ?? ''}
                        {part.companero && ` · ${part.companero.nombre}`}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{part.fuente}</div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {/* Screen-only back link */}
        <div className="mt-12 border-t border-slate-200 pt-6 print:hidden">
          <Link href={`/asignaciones/${week.id_week}`} className="text-sm font-medium text-blue-800 hover:underline">
            ← Volver a la semana
          </Link>
        </div>
      </div>
    </div>
  );
}