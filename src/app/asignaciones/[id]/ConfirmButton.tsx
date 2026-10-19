'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WeekActionCallbacks } from './week-action-types';

interface ConfirmButtonProps extends WeekActionCallbacks {
  idWeek: number;
}

export default function ConfirmButton({ idWeek, disabled, onBusyChange, onFeedback }: ConfirmButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'warning'; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    onBusyChange?.(true);
    onFeedback?.(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/asignaciones/semana/${idWeek}/confirmar`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const is409 = res.status === 409;
        throw new Error(
          data.error ||
            (is409 ? 'La semana aún tiene asignaciones sin cubrir' : 'Error al confirmar la semana')
        );
      }
      if (data.confirmed !== undefined) {
        const feedback = { kind: 'success' as const, text: `${data.confirmed} asignaciones confirmadas` };
        setMessage(feedback);
        onFeedback?.(feedback);
      }
      router.refresh();
    } catch (err) {
      const feedback = { kind: 'error' as const, text: err instanceof Error ? err.message : 'Error al confirmar la semana' };
      setMessage(feedback);
      onFeedback?.(feedback);
    } finally {
      setLoading(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-transparent bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light disabled:opacity-50"
      >
        {loading ? 'Confirmando...' : 'Confirmar semana'}
      </button>
      {message && !onFeedback && (
        <p
          role={message.kind === 'error' ? 'alert' : undefined}
          className={`mt-2 text-sm ${
            message.kind === 'error'
              ? 'text-danger-light'
              : message.kind === 'warning'
              ? 'text-amber-300'
              : 'text-brand-light'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}