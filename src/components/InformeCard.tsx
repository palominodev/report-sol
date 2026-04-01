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
      <div className="bg-white rounded-lg border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {informe.nombre.charAt(0)}{informe.apellido.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 text-balance">
                {informe.nombre} {informe.apellido}
              </h3>
              <p className="text-sm text-gray-600">
                {informe.nombre_grupo || 'Sin grupo asignado'}
              </p>
              <p className="text-xs text-gray-500">
                Registrado: {new Date(new Date(informe.fecha_registro).getTime() - (5 * 60 * 60 * 1000)).toLocaleDateString('es-PE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'America/Lima'
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
              {informe.mes} {informe.año}
            </span>
            {informe.participacion && (
              <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
                Participó
              </span>
            )}
            {esPublicador && informe.trabajo_como_auxiliar && (
              <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
                Precursor auxiliar Temporal
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{informe.horas}</div>
            <div className="text-sm text-gray-600 font-medium">Horas</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{informe.cursos}</div>
            <div className="text-sm text-gray-600 font-medium">Cursos</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {informe.participacion ? 'Sí' : 'No'}
            </div>
            <div className="text-sm text-gray-600 font-medium">Participación</div>
          </div>
        </div>

        {informe.notas && (
          <div className="border-t border-gray-100 py-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-700">
                Notas:
              </span>
              <div className="flex flex-wrap gap-1">
                  {informe.notas}
              </div>
            </div>
          </div>
        )}

        {informe.roles && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-700">
                Roles:
              </span>
              <div className="flex flex-wrap gap-1">
                {informe.roles.split(',').map((rol, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {rol.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 mt-4 flex justify-end space-x-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function EditInformeModal({
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#4A90E2] to-[#2E5BBA] rounded-t-xl p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#4A90E2] bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg aria-hidden="true" className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white text-balance">
                  Editar Informe
                </h2>
                <p className="text-blue-100 text-sm">
                  {informe.nombre} {informe.apellido} - {informe.mes} {informe.año}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 bg-[#F44336] bg-opacity-20 rounded-lg flex items-center justify-center text-white hover:bg-opacity-30 transition-colors disabled:opacity-50"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {(!esPublicador || formData.trabajo_como_auxiliar) && (
              <div>
                <label className="block text-sm font-semibold text-[#333333] mb-2">
                  Horas
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.horas}
                  onChange={(e) => setFormData({ ...formData, horas: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                  placeholder="Ingresa las horas"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#333333] mb-2">
                Cursos
              </label>
              <input
                type="number"
                min="0"
                value={formData.cursos}
                onChange={(e) => setFormData({ ...formData, cursos: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                placeholder="Ingresa el número de cursos"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#333333] mb-2">
                  Año
                </label>
                <input
                  disabled
                  type="number"
                  value={informe.año}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#666666] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#333333] mb-2">
                  Mes
                </label>
                <select
                  disabled
                  value={informe.mes}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#666666] cursor-not-allowed"
                >
                  {meses.map((mes) => (
                    <option key={mes} value={mes}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#E8F4FD] rounded-lg p-4">
              <label htmlFor="participacion" className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  id="participacion"
                  checked={formData.participacion}
                  onChange={(e) => setFormData({ ...formData, participacion: e.target.checked })}
                  className="h-5 w-5 border-[#E0E0E0] rounded transition-colors mt-0.5 mr-3 checked:bg-[#4A90E2] checked:border-[#4A90E2] focus:ring-[#4A90E2] focus:ring-2"
                />
                <div>
                  <span className="block text-sm font-medium text-[#333333]">
                    Participación en el mes
                  </span>
                  <p className="text-xs text-[#666666] mt-1">
                    Marca esta casilla si el miembro participó durante el mes seleccionado
                  </p>
                </div>
              </label>
            </div>

            {esPublicador && (
              <div className="bg-[#E8F5E8] rounded-lg p-4">
                <label htmlFor="trabajo_como_auxiliar" className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    id="trabajo_como_auxiliar"
                    checked={formData.trabajo_como_auxiliar}
                    onChange={(e) => setFormData({ ...formData, trabajo_como_auxiliar: e.target.checked })}
                    className="h-5 w-5 border-[#E0E0E0] rounded transition-colors mt-0.5 mr-3 checked:bg-[#4CAF50] checked:border-[#4CAF50] focus:ring-[#4CAF50] focus:ring-2"
                  />
                  <div>
                    <span className="block text-sm font-medium text-[#333333]">
                      Trabajó como Precursor Auxiliar
                    </span>
                    <p className="text-xs text-[#666666] mt-1">
                      Marca esta casilla si el publicador trabajó como precursor auxiliar durante el mes seleccionado
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-[#E0E0E0]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-3 text-sm font-semibold text-[#4A90E2] bg-white border border-[#4A90E2] rounded-lg hover:bg-[#E8F4FD] transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#4A90E2] to-[#2E5BBA] rounded-lg hover:from-[#2E5BBA] hover:to-[#4A90E2] transition-all shadow-sm disabled:opacity-50"
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

function DeleteConfirmModal({
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="bg-gradient-to-r from-[#F44336] to-[#D32F2F] rounded-t-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#F44336] bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg aria-hidden="true" className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white text-balance">
                Eliminar Informe
              </h2>
              <p className="text-red-100 text-sm">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <p className="text-gray-700 mb-6">
            ¿Estás seguro de que deseas eliminar el informe de{' '}
            <span className="font-semibold">{nombre}</span> del mes de{' '}
            <span className="font-semibold">{mes}</span>?
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#F44336] to-[#D32F2F] rounded-lg hover:from-[#D32F2F] hover:to-[#F44336] transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
