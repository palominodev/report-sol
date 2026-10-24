import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWeekDetail, getAssignableUsers } from '@/lib/presentation/weeks';
import { buildPrintSections, UserNameResolver } from '@/lib/presentation/printProgram';
import { meetingSectionLabel, presentationTypeLabel, salaLabel, SALA_LABELS } from '@/lib/presentation/status';
import { PresentationType, Sala } from '@/domain/entities/presentation/enums';
import { requireAccount } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AsignacionPrintPage(props: PageProps) {
  await requireAccount();
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
    <div data-print-program className="min-h-screen bg-page font-[family-name:Helvetica,Arial,sans-serif] text-ink scheme-dark print:min-h-0 print:bg-white print:text-ink-on-light print:scheme-light">
      {/* Scope the paper canvas to this route without changing the shared body theme. */}
      <style>{`
        @media print {
          body:has([data-print-program]) {
            background-color: var(--color-surface-light);
            color-scheme: light;
          }
        }
      `}</style>
      {/* Screen-only room switcher (print CSS hides it) */}
      <nav aria-label="Vista de sala" className="mx-auto flex max-w-3xl flex-wrap justify-end gap-2 px-6 pt-6 print:hidden">
        {roomTabs.map(({ sala, label }) => (
          <Link
            key={label}
            href={tabHref(sala)}
            aria-current={salaFilter === sala ? 'page' : undefined}
            className={
              salaFilter === sala
                ? 'inline-flex min-h-11 items-center border border-transparent bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light'
                : 'inline-flex min-h-11 items-center border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light'
            }
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Shared program content; printing restores the light paper palette. */}
      <div className="mx-auto my-6 max-w-3xl border border-line bg-surface px-6 py-8 print:my-0 print:border-0 print:bg-white print:py-10">
        <header className="mb-8 border-b-2 border-line print:border-black pb-6 text-center print:py-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink print:text-ink-on-light">Programa de la Reunión</h1>
          <p className="mt-1 text-base text-ink-muted print:text-ink-on-light">Reunión Vida y Ministerio</p>
          <p className="mt-1 text-sm font-medium text-ink-muted print:text-ink-muted-on-light">{week.semana}</p>
          {salaFilter ? (
            <p className="mt-1 text-sm font-semibold text-ink print:text-ink-on-light">{SALA_LABELS[salaFilter]}</p>
          ) : null}
        </header>

        {sections.length === 0 ? (
          <p className="text-center text-ink-muted print:text-ink-muted-on-light">
            Esta semana no tiene asignaciones confirmadas para imprimir.
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.seccion} className="mb-8">
              <h2 className="mb-4 border-b border-line print:border-black py-2 text-center text-lg font-bold tracking-wide text-ink print:text-ink-on-light">
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
                        <span className="text-base font-semibold text-ink print:text-ink-on-light">
                          {presentationTypeLabel(part.tipo as PresentationType)}
                        </span>
                        <span className="ml-2 text-sm text-ink-muted print:text-ink-muted-on-light">({part.duracionMin} min)</span>
                        {sala ? <span className="ml-2 text-sm text-ink-muted print:text-ink-muted-on-light">· {sala}</span> : null}
                      </div>
                      <div className="mt-1 text-sm text-ink-muted print:text-ink-on-light">
                        {part.presentador?.nombre ?? ''}
                        {part.companero && ` · ${part.companero.nombre}`}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-muted print:text-ink-muted-on-light">{part.fuente}</div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {/* Screen-only back link */}
        <div className="mt-12 border-t border-line pt-6 print:hidden">
          <Link href={`/asignaciones/${week.id_week}`} className="text-sm font-medium text-brand-light hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light">
            ← Volver a la semana
          </Link>
        </div>
      </div>
    </div>
  );
}