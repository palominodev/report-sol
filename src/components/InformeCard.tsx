'use client';

import React, { useState } from 'react';

interface Informe {
  id_informe: number;
  fecha_registro: string;
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

interface InformeCardProps {
  informe: Informe;
  onUpdate: () => void;
  onDelete: () => void;
}

const meses = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

export default function InformeCard({ informe, onUpdate, onDelete }: InformeCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esPublicador = informe.roles.split(',').map(r => r.trim()).includes('publicador');

  const handleUpdate = async (data: {
    horas: number | null;
    cursos: number;
    participacion: boolean;
    trabajo_como_auxiliar: boolean;
  }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/informe/${informe.id_informe}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error al actualizar');
      }

      setShowEditModal(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/informe/${informe.id_informe}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Error al eliminar');
      }

      setShowDeleteConfirm(false);
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-surface border border-line p-4 transition-colors duration-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-brand flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-xs">
                {informe.nombre.charAt(0)}{informe.apellido.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-ink text-balance">
                {informe.nombre} {informe.apellido}
              </h3>
              <p className="text-xs text-ink-muted truncate">
                {informe.nombre_grupo || 'Sin grupo asignado'}
              </p>
              <p className="text-[11px] text-ink-muted">
                Registrado: {new Date(new Date(informe.fecha_registro).getTime() - (5 * 60 * 60 * 1000)).toLocaleDateString('es-PE', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Lima'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {informe.mes} {informe.año}
            </span>
            {informe.participacion && (
              <span className="border border-brand-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-light">
                Participó
              </span>
            )}
            {esPublicador && informe.trabajo_como_auxiliar && (
              <span className="border border-brand-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-light">
                Precursor auxiliar
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-nav px-2 py-2 text-center">
            <div className="text-lg font-bold text-ink leading-tight">{informe.horas}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Horas</div>
          </div>
          <div className="bg-nav px-2 py-2 text-center">
            <div className="text-lg font-bold text-ink leading-tight">{informe.cursos}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Cursos</div>
          </div>
          <div className="bg-nav px-2 py-2 text-center">
            <div className="text-lg font-bold text-ink leading-tight">
              {informe.participacion ? 'Sí' : 'No'}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Participación</div>
          </div>
        </div>

        {informe.notas && (
          <div className="border-t border-line py-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                Notas:
              </span>
              <div className="flex flex-wrap gap-1">
                  {informe.notas}
              </div>
            </div>
          </div>
        )}

        {informe.roles && (
          <div className="border-t border-line pt-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                Roles:
              </span>
              <div className="flex flex-wrap gap-1">
                {informe.roles.split(',').map((rol, index) => (
                  <span key={index} className="border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                    {rol.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-line pt-3 mt-3 flex justify-end space-x-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center border border-brand-light px-3 py-1.5 text-sm font-semibold text-brand-light transition-colors duration-200 hover:bg-nav"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center border border-danger px-3 py-1.5 text-sm font-semibold text-danger-light transition-colors duration-200 hover:bg-danger hover:text-white"
          >
            <svg aria-hidden="true" className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>

      {showEditModal && (
        <EditInformeModal
          informe={informe}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          nombre={`${informe.nombre} ${informe.apellido}`}
          mes={`${informe.mes} ${informe.año}`}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </>
  );
}

export function EditInformeModal({
  informe,
  onClose,
  onSubmit,
  isSubmitting,
  error
}: {
  informe: Informe;
  onClose: () => void;
  onSubmit: (data: { horas: number | null; cursos: number; participacion: boolean; trabajo_como_auxiliar: boolean }) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}) {
  const esPublicador = informe.roles.split(',').map(r => r.trim()).includes('publicador');

  const [formData, setFormData] = useState({
    horas: informe.horas ?? 0,
    cursos: informe.cursos,
    participacion: informe.participacion,
    trabajo_como_auxiliar: informe.trabajo_como_auxiliar
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto border border-line-on-light bg-surface-light">
        <div className="bg-brand p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/15 text-white">
                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white text-balance">
                  Editar Informe
                </h2>
                <p className="text-sm text-white/80">
                  {informe.nombre} {informe.apellido} - {informe.mes} {informe.año}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex h-8 w-8 shrink-0 items-center justify-center bg-white/15 text-white transition-colors duration-200 hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {(!esPublicador || formData.trabajo_como_auxiliar) && (
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted-on-light">
                  Horas
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.horas}
                  onChange={(e) => setFormData({ ...formData, horas: parseInt(e.target.value) || 0 })}
                  className="w-full border border-line-on-light bg-surface-light px-4 py-3 text-sm text-ink-on-light placeholder:text-ink-muted-on-light transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Ingresa las horas"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted-on-light">
                Cursos
              </label>
              <input
                type="number"
                min="0"
                value={formData.cursos}
                onChange={(e) => setFormData({ ...formData, cursos: parseInt(e.target.value) || 0 })}
                className="w-full border border-line-on-light bg-surface-light px-4 py-3 text-sm text-ink-on-light placeholder:text-ink-muted-on-light transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="Ingresa el número de cursos"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted-on-light">
                  Año
                </label>
                <input
                  disabled
                  type="number"
                  value={informe.año}
                  className="w-full cursor-not-allowed border border-line-on-light bg-surface-light px-4 py-3 text-sm text-ink-muted-on-light opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted-on-light">
                  Mes
                </label>
                <select
                  disabled
                  value={informe.mes}
                  className="w-full cursor-not-allowed border border-line-on-light bg-surface-light px-4 py-3 text-sm text-ink-muted-on-light opacity-60"
                >
                  {meses.map((mes) => (
                    <option key={mes} value={mes}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-line-on-light bg-brand-tint p-4">
              <label htmlFor="participacion" className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  id="participacion"
                  checked={formData.participacion}
                  onChange={(e) => setFormData({ ...formData, participacion: e.target.checked })}
                  className="mr-3 mt-0.5 h-5 w-5 accent-brand"
                />
                <div>
                  <span className="block text-sm font-semibold text-ink-on-light">
                    Participación en el mes
                  </span>
                  <p className="mt-1 text-xs text-ink-muted-on-light">
                    Marca esta casilla si el miembro participó durante el mes seleccionado
                  </p>
                </div>
              </label>
            </div>

            {esPublicador && (
              <div className="border border-line-on-light bg-brand-tint p-4">
                <label htmlFor="trabajo_como_auxiliar" className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    id="trabajo_como_auxiliar"
                    checked={formData.trabajo_como_auxiliar}
                    onChange={(e) => setFormData({ ...formData, trabajo_como_auxiliar: e.target.checked })}
                    className="mr-3 mt-0.5 h-5 w-5 accent-brand"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-ink-on-light">
                      Trabajó como Precursor Auxiliar
                    </span>
                    <p className="mt-1 text-xs text-ink-muted-on-light">
                      Marca esta casilla si el publicador trabajó como precursor auxiliar durante el mes seleccionado
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-line-on-light">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="border border-brand px-6 py-3 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Guardando…' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DeleteConfirmModal({
  nombre,
  mes,
  onClose,
  onConfirm,
  isSubmitting,
  error
}: {
  nombre: string;
  mes: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md border border-line-on-light bg-surface-light">
        <div className="bg-danger p-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/15 text-white">
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white text-balance">
                Eliminar Informe
              </h2>
              <p className="text-sm text-white/80">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <p className="text-ink-on-light mb-6">
            ¿Estás seguro de que deseas eliminar el informe de{' '}
            <span className="font-semibold">{nombre}</span> del mes de{' '}
            <span className="font-semibold">{mes}</span>?
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="border border-line-on-light px-6 py-3 text-sm font-semibold text-ink-on-light transition-colors duration-200 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="bg-danger px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
