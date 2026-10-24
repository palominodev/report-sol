'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WeekActionCallbacks } from './week-action-types';
import { authedFetch } from '@/lib/auth/authed-fetch';

interface ConfirmButtonProps extends WeekActionCallbacks {
  idWeek: number;
  hasAssignments: boolean;
  /** Human-readable labels of the slots still uncovered (primitives only). */
  missingLabels: string[];
}

const MAX_LISTED_LABELS = 5;
const BLOCKED_REASON_ID = 'confirm-blocked-reason';

export default function ConfirmButton({ idWeek, hasAssignments, missingLabels, disabled, onBusyChange, onFeedback }: ConfirmButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const blocked = !hasAssignments || missingLabels.length > 0;
  const listed = missingLabels.slice(0, MAX_LISTED_LABELS);
  const hidden = missingLabels.length - listed.length;

  async function handleClick() {
    setLoading(true);
    onBusyChange?.(true);
    onFeedback?.(null);
    setMessage(null);
    try {
      const res = await authedFetch(`/api/asignaciones/semana/${idWeek}/confirmar`, { method: 'POST' });
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
    <div className="flex flex-col items-stretch sm:items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled || blocked}
        aria-describedby={blocked ? BLOCKED_REASON_ID : undefined}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-transparent bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light disabled:opacity-50"
      >
        {loading ? 'Confirmando...' : 'Confirmar semana'}
      </button>
      {blocked && (
        <div id={BLOCKED_REASON_ID} className="mt-2 max-w-md text-sm text-ink-muted">
          {!hasAssignments ? (
            <p>Primero generá las asignaciones.</p>
          ) : (
            <>
              <p>{missingLabels.length === 1 ? 'Falta 1 lugar:' : `Faltan ${missingLabels.length} lugares:`}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {listed.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              {hidden > 0 && <p className="mt-1">y {hidden} más</p>}
            </>
          )}
        </div>
      )}
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