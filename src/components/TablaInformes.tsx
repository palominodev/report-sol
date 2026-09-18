'use client';

import { useEffect, useMemo, useState } from 'react';
import { EditInformeModal, DeleteConfirmModal } from './InformeCard';

interface InformeTabla {
  id_informe: number;
  horas: number;
  cursos: number;
  año: number;
  mes: string;
  participacion: boolean;
  nombre: string;
  apellido: string;
  roles: string;
  nombre_grupo: string;
  trabajo_como_auxiliar: boolean;
  notas: string | null;
}

interface TablaInformesProps {
  informes: InformeTabla[];
  onRefresh: () => void;
  /** Reports the number of rows currently visible (after local role filter) */
  onVisibleCountChange?: (count: number) => void;
}

type CampoOrden = 'publicador' | 'grupo' | 'periodo' | 'horas' | 'cursos' | 'participo';

const MESES_IDX: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
  JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
};

export default function TablaInformes({ informes, onRefresh, onVisibleCountChange }: TablaInformesProps) {
  const [informeEditando, setInformeEditando] = useState<InformeTabla | null>(null);
  const [informeAEliminar, setInformeAEliminar] = useState<InformeTabla | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>([]);
  const [panelRolesAbierto, setPanelRolesAbierto] = useState(false);
  const [orden, setOrden] = useState<{ campo: CampoOrden | null; dir: 'asc' | 'desc' }>({
    campo: null,
    dir: 'asc',
  });

  const alternarRol = (rol: string) => {
    setRolesSeleccionados((prev) =>
      prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol],
    );
  };

  const rolesDisponibles = useMemo(() => {
    const roles = new Set<string>();
    for (const informe of informes) {
      if (!informe.roles) continue;
      for (const rol of informe.roles.split(',')) {
        const limpio = rol.trim();
        if (limpio) roles.add(limpio);
      }
    }
    return [...roles].sort((a, b) => a.localeCompare(b, 'es'));
  }, [informes]);

  const informesFiltrados = useMemo(() => {
    if (rolesSeleccionados.length === 0) return informes;
    const seleccion = rolesSeleccionados.map((r) => r.toLowerCase());
    return informes.filter((informe) =>
      informe.roles?.split(',').some((rol) => seleccion.includes(rol.trim().toLowerCase())),
    );
  }, [informes, rolesSeleccionados]);

  useEffect(() => {
    onVisibleCountChange?.(informesFiltrados.length);
  }, [informesFiltrados, onVisibleCountChange]);

  const alternarOrden = (campo: CampoOrden) => {
    setOrden((prev) => {
      if (prev.campo !== campo) return { campo, dir: 'asc' };
      if (prev.dir === 'asc') return { campo, dir: 'desc' };
      return { campo: null, dir: 'asc' };
    });
  };

  const informesOrdenados = useMemo(() => {
    const campo = orden.campo;
    if (!campo) return informesFiltrados;
    const factor = orden.dir === 'asc' ? 1 : -1;
    const valor = (informe: InformeTabla): string | number => {
      switch (campo) {
        case 'publicador': return `${informe.nombre} ${informe.apellido}`.toLowerCase();
        case 'grupo': return (informe.nombre_grupo || '').toLowerCase();
        case 'periodo': return informe.año * 12 + (MESES_IDX[informe.mes] ?? 0);
        case 'horas': return informe.horas ?? 0;
        case 'cursos': return informe.cursos ?? 0;
        case 'participo': return informe.participacion ? 1 : 0;
      }
    };
    return [...informesFiltrados].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'es') * factor;
    });
  }, [informesFiltrados, orden]);

  const ariaSort = (campo: CampoOrden): 'ascending' | 'descending' | 'none' =>
    orden.campo === campo ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none';

  const sortIcon = (campo: CampoOrden) => {
    if (orden.campo !== campo) {
      return (
        <svg aria-hidden="true" className="h-3 w-3 text-icon/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l4-4 4 4M8 15l4 4 4-4" />
        </svg>
      );
    }
    return orden.dir === 'asc' ? (
      <svg aria-hidden="true" className="h-3 w-3 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg aria-hidden="true" className="h-3 w-3 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const thClass = 'px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink-muted';
  const btnClass = (campo: CampoOrden, align: 'left' | 'right' = 'left') =>
    `inline-flex w-full cursor-pointer items-center gap-1 ${align === 'right' ? 'justify-end' : ''} uppercase transition-colors duration-150 hover:text-ink motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40`;

  const handleUpdate = async (data: {
    horas: number | null;
    cursos: number;
    participacion: boolean;
    trabajo_como_auxiliar: boolean;
  }) => {
    if (!informeEditando) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/informe/${informeEditando.id_informe}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error al actualizar');
      }

      setInformeEditando(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!informeAEliminar) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/informe/${informeAEliminar.id_informe}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error al eliminar');
      }

      setInformeAEliminar(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {error && (
        <div role="alert" className="mb-3 border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger-light">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border border-line bg-surface lg:overflow-visible">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" aria-sort={ariaSort('publicador')} className={thClass}>
                <button type="button" onClick={() => alternarOrden('publicador')} className={btnClass('publicador')}>
                  Publicador {sortIcon('publicador')}
                </button>
              </th>
              <th scope="col" aria-sort={ariaSort('grupo')} className={thClass}>
                <button type="button" onClick={() => alternarOrden('grupo')} className={btnClass('grupo')}>
                  Grupo {sortIcon('grupo')}
                </button>
              </th>
              <th scope="col" aria-sort={ariaSort('periodo')} className={thClass}>
                <button type="button" onClick={() => alternarOrden('periodo')} className={btnClass('periodo')}>
                  Período {sortIcon('periodo')}
                </button>
              </th>
              <th scope="col" aria-sort={ariaSort('horas')} className={thClass}>
                <button type="button" onClick={() => alternarOrden('horas')} className={btnClass('horas', 'right')}>
                  Horas {sortIcon('horas')}
                </button>
              </th>
              <th scope="col" aria-sort={ariaSort('cursos')} className={thClass}>
                <button type="button" onClick={() => alternarOrden('cursos')} className={btnClass('cursos', 'right')}>
                  Cursos {sortIcon('cursos')}
                </button>
              </th>
              <th scope="col" aria-sort={ariaSort('participo')} className={thClass}>
                <button type="button" onClick={() => alternarOrden('participo')} className={btnClass('participo')}>
                  Participó {sortIcon('participo')}
                </button>
              </th>
              <th scope="col" className={thClass}>
                <div
                  className="relative"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setPanelRolesAbierto(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPanelRolesAbierto((abierto) => !abierto)}
                    aria-expanded={panelRolesAbierto}
                    aria-haspopup="true"
                    className={`inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors duration-150 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 motion-reduce:transition-none ${
                      rolesSeleccionados.length > 0 ? 'text-brand-light' : 'text-ink-muted'
                    }`}
                  >
                    Rol{rolesSeleccionados.length > 0 ? ` (${rolesSeleccionados.length})` : ''}
                    <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {panelRolesAbierto && (
                    <div
                      role="group"
                      aria-label="Filtrar por roles"
                      className="absolute left-0 top-full z-10 mt-1 max-h-64 w-44 overflow-auto border border-line bg-surface py-1"
                    >
                      {rolesDisponibles.length === 0 && (
                        <p className="px-3 py-2 text-xs text-ink-muted">Sin roles</p>
                      )}
                      {rolesDisponibles.map((rol) => (
                        <label
                          key={rol}
                          className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-ink transition-colors duration-150 hover:bg-nav motion-reduce:transition-none"
                        >
                          <input
                            type="checkbox"
                            checked={rolesSeleccionados.includes(rol)}
                            onChange={() => alternarRol(rol)}
                            className="h-3.5 w-3.5 accent-brand"
                          />
                          {rol}
                        </label>
                      ))}
                      {rolesSeleccionados.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRolesSeleccionados([])}
                          className="mt-1 w-full cursor-pointer border-t border-line px-3 py-1.5 text-left text-xs font-semibold text-brand-light hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                        >
                          Limpiar selección
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </th>
              <th scope="col" className={thClass}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {informesOrdenados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-muted">
                  Sin informes para el rol seleccionado.
                </td>
              </tr>
            )}
            {informesOrdenados.map((informe) => (
              <tr key={informe.id_informe} className="transition-colors duration-150 hover:bg-nav">
                <td className="px-4 py-2.5 font-semibold text-ink">
                  {informe.nombre} {informe.apellido}
                </td>
                <td className="px-4 py-2.5 text-ink-muted">{informe.nombre_grupo || 'Sin grupo'}</td>
                <td className="px-4 py-2.5 text-ink-muted">
                  {informe.mes} {informe.año}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-ink">{informe.horas}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-ink">{informe.cursos}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      informe.participacion
                        ? 'border-brand-light text-brand-light'
                        : 'border-line text-ink-muted'
                    }`}
                  >
                    {informe.participacion ? 'Sí' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex max-w-40 flex-wrap gap-1">
                    {informe.roles
                      ? informe.roles.split(',').map((rol, index) => (
                          <span
                            key={index}
                            className="border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted"
                          >
                            {rol.trim()}
                          </span>
                        ))
                      : <span className="text-[10px] uppercase tracking-wider text-ink-muted">—</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInformeEditando(informe)}
                      aria-label={`Editar informe de ${informe.nombre} ${informe.apellido}`}
                      className="flex h-8 w-8 items-center justify-center border border-line text-icon transition-colors duration-200 hover:border-brand-light hover:text-brand-light"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInformeAEliminar(informe)}
                      aria-label={`Eliminar informe de ${informe.nombre} ${informe.apellido}`}
                      className="flex h-8 w-8 items-center justify-center border border-line text-icon transition-colors duration-200 hover:border-danger hover:text-danger-light"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {informeEditando && (
        <EditInformeModal
          informe={informeEditando}
          onClose={() => setInformeEditando(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}

      {informeAEliminar && (
        <DeleteConfirmModal
          nombre={`${informeAEliminar.nombre} ${informeAEliminar.apellido}`}
          mes={`${informeAEliminar.mes} ${informeAEliminar.año}`}
          onClose={() => setInformeAEliminar(null)}
          onConfirm={handleDelete}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </>
  );
}
