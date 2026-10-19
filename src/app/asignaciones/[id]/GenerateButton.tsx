'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SalaPolicy } from '@/core/application/use-cases/presentation/AdoptSalaRoomsUseCase';
import SalaPolicyModal from './SalaPolicyModal';
import type { WeekActionCallbacks } from './week-action-types';

interface GenerateButtonProps extends WeekActionCallbacks {
  idWeek: number;
  label: string;
  nullSalaParts: number;
}

export default function GenerateButton({ idWeek, label, nullSalaParts, disabled, onBusyChange, onFeedback }: GenerateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [askPolicy, setAskPolicy] = useState(false);

  async function generate(policy?: SalaPolicy) {
    setLoading(true);
    onBusyChange?.(true);
    onFeedback?.(null);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/asignaciones/semana/${idWeek}/generar`, {
        method: 'POST',
        ...(policy && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salaPolicy: policy }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Error al generar asignaciones');
      }
      if (data.unassigned && data.unassigned.length > 0) {
        setNotice(
          `${data.assignments?.length ?? 0} asignaciones generadas, ${data.unassigned.length} sin cubrir`
        );
      } else if (data.assignments) {
        setNotice(`${data.assignments.length} asignaciones generadas`);
      }
      onFeedback?.({
        kind: 'success',
        text: data.unassigned?.length
          ? `${data.assignments?.length ?? 0} asignaciones generadas, ${data.unassigned.length} sin cubrir`
          : `${data.assignments?.length ?? 0} asignaciones generadas`,
      });
      setAskPolicy(false);
      router.refresh();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Error al generar asignaciones';
      setError(text);
      onFeedback?.({ kind: 'error', text });
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  }

  function handleClick() {
    // Weeks with unassigned-sala parts must pick a policy before regenerating.
    if (nullSalaParts > 0) {
      setAskPolicy(true);
      return;
    }
    void generate();
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-transparent bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light disabled:opacity-50"
      >
        {loading ? 'Generando...' : label}
      </button>
      {error && !askPolicy && !onFeedback && (
        <p role="alert" className="mt-2 text-sm text-danger-light">
          {error}
        </p>
      )}
      {notice && !onFeedback && (
        <p className="mt-2 text-sm text-ink-muted">{notice}</p>
      )}
      {askPolicy && (
        <SalaPolicyModal
          nullSalaParts={nullSalaParts}
          isSubmitting={loading}
          error={error}
          onCancel={() => setAskPolicy(false)}
          onConfirm={(policy) => void generate(policy)}
        />
      )}
    </div>
  );
}