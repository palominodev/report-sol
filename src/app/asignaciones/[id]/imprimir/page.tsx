import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWeekDetail, getAssignableUsers } from '@/lib/presentation/weeks';
import { buildPrintSections, UserNameResolver } from '@/lib/presentation/printProgram';
import { meetingSectionLabel, presentationTypeLabel, salaLabel } from '@/lib/presentation/status';
import { PresentationType } from '@/domain/entities/presentation/enums';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AsignacionPrintPage(props: PageProps) {
  const params = await props.params;
  const idWeek = Number(params.id);
  if (!Number.isInteger(idWeek) || idWeek <= 0) notFound();

  const [{ week, parts, assignments }, users] = await Promise.all([
    getWeekDetail(idWeek),
    getAssignableUsers(),
  ]);

  const namesById = new Map<number, string>(users.map((u) => [u.id_usuario, `${u.nombre} ${u.apellido}`]));
  const resolveName: UserNameResolver = (id) => namesById.get(id) ?? 'Sin asignar';

  const sections = buildPrintSections(parts, assignments, resolveName);

  return (
    <div className="min-h-screen bg-white">
      {/* Print-only header */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header className="mb-8 border-b-2 border-black pb-6 text-center print:py-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Programa de la Reunión</h1>
          <p className="mt-1 text-base text-slate-700">Reunión Vida y Ministerio</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{week.semana}</p>
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
                  const sala = salaLabel(part.sala);
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