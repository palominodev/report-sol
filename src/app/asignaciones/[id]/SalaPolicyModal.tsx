'use client';

import { useEffect, useRef, useState } from 'react';
import type { SalaPolicy } from '@/core/application/use-cases/presentation/AdoptSalaRoomsUseCase';

interface SalaPolicyModalProps {
  nullSalaParts: number;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (policy: SalaPolicy) => void;
}

const POLICY_OPTIONS: { value: SalaPolicy; label: string; help: string }[] = [
  {
    value: 'adopt_and_clone',
    label: 'Asignar a Sala A y clonar a Sala B',
    help: 'Las partes sin sala pasan a Sala A y se crea su copia en Sala B. Se conservan las asignaciones manuales.',
  },
  {
    value: 'rebuild',
    label: 'Reconstruir ambas salas',
    help: 'Normaliza la semana a pares A/B. Restablece la distribución entre salas; se conservan las partes y las asignaciones manuales.',
  },
];

export default function SalaPolicyModal({
  nullSalaParts,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: SalaPolicyModalProps) {
  const [policy, setPolicy] = useState<SalaPolicy>('adopt_and_clone');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isSubmitting) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sala-policy-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-sm outline-none"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 id="sala-policy-title" className="text-lg font-semibold text-slate-900">
            Partes sin sala asignada
          </h2>
        </div>

        <div className="px-6 py-5">
          <p id="sala-policy-context" className="text-sm text-slate-600">
            Esta semana hay{' '}
            <span className="font-semibold text-slate-900">{nullSalaParts}</span> parte(s) sin sala
            asignada. Selecciona cómo proceder antes de regenerar.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div role="radiogroup" aria-labelledby="sala-policy-context" className="mt-4 space-y-3">
            {POLICY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  policy === option.value
                    ? 'border-blue-800 bg-blue-50'
                    : 'border-slate-200 hover:bg-slate-50'
                } ${isSubmitting ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <input
                  type="radio"
                  name="salaPolicy"
                  value={option.value}
                  checked={policy === option.value}
                  onChange={() => setPolicy(option.value)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-blue-800"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{option.help}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(policy)}
              disabled={isSubmitting}
              className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Generando...' : 'Regenerar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
