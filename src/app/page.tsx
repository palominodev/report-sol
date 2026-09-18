import Link from "next/link";
import Image from "next/image";
import { getGrupos } from '@/lib/getGrupos';
import { getPublicadores } from '@/lib/getUsuarios';
import { GrupoDetails } from '@/core/domain/repositories/IGrupoRepository';
import BuscadorPublicadores from '@/components/BuscadorPublicadores';

export default async function Home() {
  const [grupos, publicadores] = await Promise.all([getGrupos(), getPublicadores()]);

  const publicadorOptions = publicadores.flatMap((publicador) =>
    publicador.id_grupo == null
      ? []
      : [
          {
            id_usuario: publicador.id_usuario,
            nombre: publicador.nombre,
            apellido: publicador.apellido,
            id_grupo: publicador.id_grupo,
          },
        ],
  );

  return (
    <div className="min-h-screen bg-page font-[family-name:Helvetica,Arial,sans-serif] text-ink flex flex-col">
      {/* Header — jw.org dark pattern: black bar, blue logo chip, thin border */}
      <header className="bg-page border-b border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-brand-light"
          >
            <span
              aria-hidden="true"
              className="bg-brand px-2 py-1.5 text-base font-bold leading-none text-white"
            >
              RS
            </span>
            <span className="text-lg font-bold tracking-tight text-ink">REPORT SOL</span>
          </Link>
          <span className="hidden sm:block text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Sistema de Informes
          </span>
        </div>
      </header>

      {/* Hero — jw.org billboard pattern: full-width photo, gradient overlay, text + brand button */}
      <section className="relative h-72 sm:h-96 lg:h-[440px]">
        <Image
          src="/images/home-banner.jpg"
          alt="Fotografía grupal de la comunidad durante una actividad de predicación nocturna"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_45%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent"
        />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="max-w-xl">
              <h1 className="text-3xl sm:text-4xl font-bold text-white text-balance">
                Gestión de Grupos
              </h1>
              <p className="mt-3 text-base sm:text-lg text-white/90 text-pretty">
                Administra y visualiza todos los grupos de la organización.
              </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#grupos"
              className="inline-block bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-white"
            >
              Explorar grupos
            </a>
            <BuscadorPublicadores publicadores={publicadorOptions} />
          </div>
            </div>
          </div>
        </div>
      </section>

      {/* Groups grid — jw.org dark pattern: white headings on black, flat panels */}
      <main id="grupos" className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 flex-1">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-bold text-ink">Grupos</h2>
          <span className="text-sm text-ink-muted">
            {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} en total
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {grupos.map((grupo: GrupoDetails) => (
            <Link
              key={grupo.id_grupo}
              href={`grupo/${grupo.id_grupo}/`}
              className="group block bg-surface border border-line transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-brand-light"
            >
              <article className="p-5 h-full">
                <h3 className="text-base font-semibold text-brand-light group-hover:underline decoration-1 underline-offset-4">
                  {grupo.nombre_grupo}
                </h3>

                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      Encargado
                    </dt>
                    <dd className="mt-0.5 text-sm text-ink">
                      {grupo.encargado || 'Sin asignar'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      Auxiliar
                    </dt>
                    <dd className="mt-0.5 text-sm text-ink">
                      {grupo.auxiliar || 'Sin asignar'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-light group-hover:underline decoration-1 underline-offset-4">
                    Ver detalles
                  </span>
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 text-icon transition-colors duration-200 group-hover:text-brand-light"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {grupos.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-surface border border-line flex items-center justify-center mx-auto mb-4">
              <svg aria-hidden="true" className="w-10 h-10 text-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2 text-balance">
              No hay grupos disponibles
            </h3>
            <p className="text-sm text-ink-muted">
              Comienza creando tu primer grupo para organizar tu equipo.
            </p>
          </div>
        )}
      </main>

      {/* Footer — jw.org dark pattern: black section + #292929 copyright bar */}
      <footer className="mt-auto">
        <div className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Report Sol <span className="mx-1.5" aria-hidden="true">/</span> Sistema de Informes
            </p>
          </div>
        </div>
        <div className="bg-nav">
          <p className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-xs text-white/80">
            © {new Date().getFullYear()} Report Sol. Todos los derechos reservados.
            <span className="mx-1.5" aria-hidden="true">|</span>
            <Link href="/" className="underline decoration-1 underline-offset-2 hover:text-white transition-colors">
              Condiciones de uso
            </Link>
            <span className="mx-1.5" aria-hidden="true">|</span>
            <Link href="/" className="underline decoration-1 underline-offset-2 hover:text-white transition-colors">
              Política de privacidad
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
