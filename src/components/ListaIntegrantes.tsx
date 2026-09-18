'use client';

import { useState } from 'react';
import Link from 'next/link';
import FormularioInforme from './FormularioInforme';

interface Integrante {
  id_usuario: number;
  nombre: string;
  apellido: string;
  rol_en_grupo: string;
  roles: string | null;
  informe_enviado: boolean;
}

interface ListaIntegrantesProps {
  integrantes: Integrante[];
  nombreGrupo: string;
  mes: string;
  año: number;
  /** id_usuario whose report form should open on load (?informe= deep link) */
  informeInicialId?: number | null;
}

const getRolEnGrupoBadge = (rol: string): string => {
  if (rol === 'encargado') return 'bg-brand text-white';
  if (rol === 'auxiliar') return 'bg-nav text-ink';
  return 'hidden';
};

function MensajeInformeEnviado({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-surface-light w-full max-w-md border border-line-on-light">
        {/* Header — jw.org pattern: solid brand band, square corners */}
        <div className="bg-danger p-5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white text-balance">Informe Ya Enviado</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="h-8 w-8 flex items-center justify-center bg-white/15 text-white hover:bg-white/25 transition-colors"
          >
            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-ink-on-light mb-2 text-balance">
              Este informe ya fue enviado
            </h3>
            <p className="text-sm text-ink-muted-on-light mb-6">
              Comuníquese con su encargado para que se pueda enviar un nuevo informe.
            </p>
            <button
              onClick={onClose}
              className="border border-danger px-5 py-2.5 text-sm font-semibold text-danger transition-colors duration-200 hover:bg-danger hover:text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FiltroInformes({ estado, setEstado }: { estado: string; setEstado: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        htmlFor="filtro-estado-informe"
        className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted"
      >
        Estado de informe
      </label>
      <select
        id="filtro-estado-informe"
        value={estado}
        onChange={(e) => setEstado(e.target.value)}
        className="h-10 border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-light"
      >
        <option value="todos">Todos</option>
        <option value="enviados">Enviados</option>
        <option value="pendientes">Pendientes</option>
      </select>
    </div>
  );
}

export default function ListaIntegrantes({ integrantes, nombreGrupo, mes, año, informeInicialId = null }: ListaIntegrantesProps) {
  const inicial = informeInicialId
    ? integrantes.find((i) => i.id_usuario === informeInicialId) ?? null
    : null;
  const [selectedIntegrante, setSelectedIntegrante] = useState<Integrante | null>(
    inicial && !inicial.informe_enviado ? inicial : null,
  );
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [showMensajeEnviado, setShowMensajeEnviado] = useState<boolean>(Boolean(inicial?.informe_enviado));

  const integrantesFiltrados = integrantes.filter((i) => {
    if (estadoFiltro === 'enviados') return i.informe_enviado;
    if (estadoFiltro === 'pendientes') return !i.informe_enviado;
    return true;
  });

  const handleIntegranteClick = (integrante: Integrante) => {
    if (integrante.informe_enviado) {
      setShowMensajeEnviado(true);
    } else {
      setSelectedIntegrante(integrante);
    }
  };

  const handleSubmitInforme = async (data: unknown) => {
    try {
      const response = await fetch('/api/informe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(data as Record<string, unknown>),
          id_usuario: selectedIntegrante?.id_usuario,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el informe');
      }

      // Recargar la página después de enviar el informe
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar el informe');
    }
  };

  const totalEncargados = integrantes.filter((i) => i.rol_en_grupo === 'encargado').length;
  const totalAuxiliares = integrantes.filter((i) => i.rol_en_grupo === 'auxiliar').length;

  return (
    <div className="min-h-screen bg-page font-[family-name:Helvetica,Arial,sans-serif] text-ink">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Back navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-brand-light hover:underline decoration-1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-light"
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a grupos
        </Link>

        {/* Header — jw.org pattern: uppercase kicker, bold title, muted meta */}
        <header className="mt-4 mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">Grupo</p>
          <h1 className="mt-1 text-3xl font-bold text-ink text-balance">{nombreGrupo}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Estado de informes · {mes} {año}
          </p>
        </header>

        {/* Stats — flat dark panels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface border border-line p-4 text-center">
            <div className="text-2xl font-bold text-ink">{integrantes.length}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              Integrantes
            </div>
          </div>
          <div className="bg-surface border border-line p-4 text-center">
            <div className="text-2xl font-bold text-brand-light">{totalEncargados}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              Encargados
            </div>
          </div>
          <div className="bg-surface border border-line p-4 text-center">
            <div className="text-2xl font-bold text-brand-light">{totalAuxiliares}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              Auxiliares
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4">
          <FiltroInformes estado={estadoFiltro} setEstado={setEstadoFiltro} />
        </div>

        {/* Members list — flat panel, divided rows */}
        <section className="bg-surface border border-line">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="text-lg font-bold text-ink">Miembros</h2>
          </div>

          <ul className="divide-y divide-line">
            {integrantesFiltrados.map((integrante) => (
              <li key={integrante.id_usuario}>
                <button
                  type="button"
                  onClick={() => handleIntegranteClick(integrante)}
                  aria-disabled={integrante.informe_enviado}
                  className={`group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 ${
                    integrante.informe_enviado
                      ? 'cursor-default opacity-75'
                      : 'cursor-pointer hover:bg-nav'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Initials chip — brand square, like the logo chip */}
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand text-sm font-semibold text-white"
                    >
                      {integrante.nombre.charAt(0)}
                      {integrante.apellido.charAt(0)}
                    </span>

                    <div className="min-w-0">
                      <h3
                        className={`truncate text-base font-semibold transition-colors duration-200 ${
                          integrante.informe_enviado
                            ? 'text-ink-muted'
                            : 'text-ink group-hover:text-brand-light'
                        }`}
                      >
                        {integrante.nombre} {integrante.apellido}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {integrante.rol_en_grupo !== 'miembro' && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getRolEnGrupoBadge(integrante.rol_en_grupo)}`}
                          >
                            {integrante.rol_en_grupo}
                          </span>
                        )}
                        {integrante.roles ? (
                          integrante.roles.split(',').map((rol, index) => (
                            <span
                              key={index}
                              className="border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted"
                            >
                              {rol.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                            Sin roles
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        integrante.informe_enviado
                          ? 'border-line text-ink-muted'
                          : 'border-brand-light text-brand-light'
                      }`}
                    >
                      {integrante.informe_enviado ? 'Enviado' : 'Pendiente'}
                    </span>
                    {!integrante.informe_enviado && (
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4 text-icon transition-colors duration-200 group-hover:text-brand-light"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Empty state */}
          {integrantes.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center border border-line bg-surface">
                <svg aria-hidden="true" className="w-10 h-10 text-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2 text-balance">No hay integrantes</h3>
              <p className="text-sm text-ink-muted">Este grupo aún no tiene miembros asignados.</p>
            </div>
          )}
        </section>
      </div>

      {/* Modal de formulario de informe */}
      {selectedIntegrante && (
        <FormularioInforme
          id_usuario={selectedIntegrante.id_usuario}
          nombre={selectedIntegrante.nombre}
          apellido={selectedIntegrante.apellido}
          roles={selectedIntegrante.roles ? selectedIntegrante.roles.split(',') : []}
          onClose={() => setSelectedIntegrante(null)}
          onSubmit={handleSubmitInforme}
        />
      )}

      {/* Modal de mensaje de informe ya enviado */}
      {showMensajeEnviado && (
        <MensajeInformeEnviado onClose={() => setShowMensajeEnviado(false)} />
      )}
    </div>
  );
}
