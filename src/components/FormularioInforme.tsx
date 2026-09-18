'use client';

import { useState } from 'react';

interface FormularioInformeProps {
  id_usuario: number;
  nombre: string;
  apellido: string;
  roles: string[];
  onClose: () => void;
  onSubmit: (data: InformeData) => Promise<void>;
}

interface InformeData {
  horas: number;
  cursos: number;
  año: number;
  mes: string;
  participacion: boolean;
  trabajo_como_auxiliar: boolean;
  notas: string | null;
}

const meses = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

export default function FormularioInforme({ id_usuario, nombre, apellido, roles, onClose, onSubmit }: FormularioInformeProps) {
  // Calcular mes y año anterior para el informe
  const fechaActual = new Date();
  const mesActualIdx = fechaActual.getMonth();
  const anioActual = fechaActual.getFullYear();

  // Si estamos en enero (0), el informe es de diciembre (11) del año anterior
  const mesInformeIdx = mesActualIdx === 0 ? 11 : mesActualIdx - 1;
  const anioInforme = mesActualIdx === 0 ? anioActual - 1 : anioActual;

  const [formData, setFormData] = useState<InformeData>({
    horas: 0,
    cursos: 0,
    año: anioInforme,
    mes: meses[mesInformeIdx],
    participacion: true,
    trabajo_como_auxiliar: false,
    notas: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const esPublicador = roles.includes('publicador');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full border border-line-on-light bg-surface-light px-4 py-3 text-sm text-ink-on-light placeholder:text-ink-muted-on-light focus:outline-none focus:ring-2 focus:ring-brand';
  const labelClass =
    'mb-2 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted-on-light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Registrar informe de ${nombre} ${apellido}`}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-line-on-light bg-surface-light"
      >
        {/* Header — jw.org pattern: solid brand band, square corners */}
        <div className="flex items-center justify-between bg-brand p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
              Registrar Informe
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-white text-balance">
              {nombre} {apellido}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center bg-white/15 text-white transition-colors duration-200 hover:bg-white/25"
          >
            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info Card */}
          <div className="mb-6 border border-line-on-light bg-brand-tint p-4">
            <div className="flex items-center space-x-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center bg-brand text-sm font-semibold text-white"
              >
                {nombre.charAt(0)}
                {apellido.charAt(0)}
              </span>
              <div>
                <h3 className="font-semibold text-ink-on-light text-balance">
                  {nombre} {apellido}
                </h3>
                <p className="text-sm text-ink-muted-on-light">ID: {id_usuario}</p>
                {roles.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {roles.map((rol, index) => (
                      <span
                        key={index}
                        className="border border-brand px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand"
                      >
                        {rol.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {(!esPublicador || formData.trabajo_como_auxiliar) && (
              <div>
                <label htmlFor="informe-horas" className={labelClass}>
                  Horas
                </label>
                <input
                  id="informe-horas"
                  type="number"
                  min="0"
                  value={formData.horas}
                  onChange={(e) => setFormData({ ...formData, horas: parseInt(e.target.value) || 0 })}
                  className={inputClass}
                  placeholder="Ingresa las horas"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="informe-cursos" className={labelClass}>
                Cursos
              </label>
              <input
                id="informe-cursos"
                type="number"
                min="0"
                value={formData.cursos}
                onChange={(e) => setFormData({ ...formData, cursos: parseInt(e.target.value) || 0 })}
                className={inputClass}
                placeholder="Ingresa el número de cursos"
                required
              />
            </div>

            <div>
              <label htmlFor="informe-notas" className={labelClass}>
                Notas
              </label>
              <textarea
                id="informe-notas"
                value={formData.notas || ''}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className={inputClass}
                placeholder="Ingresa las notas"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="informe-año" className={labelClass}>
                  Año
                </label>
                <input
                  id="informe-año"
                  disabled
                  type="number"
                  value={formData.año || 0}
                  className={`${inputClass} cursor-not-allowed opacity-60`}
                />
              </div>

              <div>
                <label htmlFor="informe-mes" className={labelClass}>
                  Mes
                </label>
                <select
                  id="informe-mes"
                  disabled
                  value={formData.mes}
                  className={`${inputClass} cursor-not-allowed opacity-60`}
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
              <label htmlFor="participacion" className="flex cursor-pointer items-start">
                <input
                  type="checkbox"
                  id="participacion"
                  checked={formData.participacion}
                  onChange={(e) => setFormData({ ...formData, participacion: e.target.checked })}
                  className="mr-3 mt-0.5 h-5 w-5 accent-brand"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-on-light">
                    Participación en el mes
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted-on-light">
                    Marca esta casilla si el miembro participó durante el mes seleccionado
                  </span>
                </span>
              </label>
            </div>

            {/* Checkbox para trabajo como auxiliar - solo para publicadores */}
            {esPublicador && (
              <div className="border border-line-on-light bg-brand-tint p-4">
                <label htmlFor="trabajo_como_auxiliar" className="flex cursor-pointer items-start">
                  <input
                    type="checkbox"
                    id="trabajo_como_auxiliar"
                    checked={formData.trabajo_como_auxiliar}
                    onChange={(e) => setFormData({ ...formData, trabajo_como_auxiliar: e.target.checked })}
                    className="mr-3 mt-0.5 h-5 w-5 accent-brand"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink-on-light">
                      Trabajó como Precursor Auxiliar
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted-on-light">
                      Marca esta casilla si el publicador trabajó como precursor auxiliar durante el mes seleccionado
                    </span>
                  </span>
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 border-t border-line-on-light pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-w-[150px] items-center justify-center bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <svg aria-hidden="true" className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando…
                  </>
                ) : (
                  'Guardar Informe'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
