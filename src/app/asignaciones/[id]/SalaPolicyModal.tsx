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
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto border border-line bg-surface text-ink outline-none"
      >
        <div className="border-b border-line bg-page px-6 py-4">
          <h2 id="sala-policy-title" className="text-lg font-semibold text-ink">
            Partes sin sala asignada
          </h2>
        </div>

        <div className="px-6 py-5">
          <p id="sala-policy-context" className="text-sm text-ink-muted">
            Esta semana hay{' '}
            <span className="font-semibold text-ink">{nullSalaParts}</span> parte(s) sin sala
            asignada. Selecciona cómo proceder antes de regenerar.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-3 border border-danger-light bg-danger/10 px-3 py-2 text-sm text-danger-light"
            >
              {error}
            </p>
          )}

          <div role="radiogroup" aria-labelledby="sala-policy-context" className="mt-4 space-y-3">
            {POLICY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                  policy === option.value
                    ? 'border-brand-light bg-brand-highlight'
                    : 'border-line hover:bg-nav'
                } ${isSubmitting ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <input
                  type="radio"
                  name="salaPolicy"
                  value={option.value}
                  checked={policy === option.value}
                  onChange={() => setPolicy(option.value)}
                  disabled={isSubmitting}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-light"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">{option.label}</span>
                  <span className="mt-1 block text-xs text-ink-muted">{option.help}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(policy)}
              disabled={isSubmitting}
              className="bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Generando...' : 'Regenerar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
