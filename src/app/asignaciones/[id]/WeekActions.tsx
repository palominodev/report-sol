'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import GenerateButton from './GenerateButton';
import ConfirmButton from './ConfirmButton';
import type { WeekActionFeedback } from './week-action-types';

interface WeekActionsProps {
  idWeek: number;
  weekLabel: string;
  hasAssignments: boolean;
  isConfirmed: boolean;
  nullSalaParts: number;
  /** Readable labels of uncovered slots; defaults to none. */
  missingLabels?: string[];
}

export default function WeekActions({ idWeek, weekLabel, hasAssignments, isConfirmed, nullSalaParts, missingLabels = [] }: WeekActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const discardDialog = useRef<HTMLDialogElement>(null);
  const [feedback, setFeedback] = useState<WeekActionFeedback | null>(null);
  const callbacks = { disabled: busy, onBusyChange: setBusy, onFeedback: setFeedback };

  async function discard() {
    if (busy) return;
    setBusy(true);
    setDiscardError(null);
    setDiscarding(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/asignaciones/semana/${idWeek}/descartar`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Error al descartar la generación');
      discardDialog.current?.close();
      setFeedback({ kind: 'success', text: `Generación descartada: ${data.discarded} asignaciones eliminadas.` });
      router.refresh();
    } catch (error) {
      setDiscardError(error instanceof Error ? error.message : 'Error al descartar la generación');
    } finally {
      setDiscarding(false);
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div aria-label="Acciones de la semana" role="group" className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {!isConfirmed && (
            <GenerateButton idWeek={idWeek} label={hasAssignments ? 'Regenerar' : 'Generar'} nullSalaParts={nullSalaParts} {...callbacks} />
          )}
          <Link href={`/asignaciones/${idWeek}/imprimir`} className="inline-flex min-h-11 items-center justify-center border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light">
            Ver programa imprimible
          </Link>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4">
          {hasAssignments && (
            <button type="button" onClick={() => {
              setDiscardError(null);
              discardDialog.current?.showModal();
            }} disabled={busy} className="inline-flex min-h-11 items-center justify-center border border-danger-light px-4 py-2.5 text-sm font-semibold text-danger-light transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-light disabled:opacity-50">
              {discarding ? 'Descartando...' : 'Descartar generación'}
            </button>
          )}
          {isConfirmed ? (
            <p className="text-sm font-semibold text-emerald-300">Semana confirmada. Lista para imprimir.</p>
          ) : (
            <ConfirmButton idWeek={idWeek} hasAssignments={hasAssignments} missingLabels={missingLabels} {...callbacks} />
          )}
        </div>
      </div>
      <dialog
        ref={discardDialog}
        aria-labelledby="discard-title"
        aria-describedby="discard-description discard-warning"
        onCancel={(event) => { if (discarding) event.preventDefault(); }}
        className="m-auto w-[calc(100%-2rem)] max-w-md border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
      >
        <div className="border-b border-line px-6 py-4">
          <h2 id="discard-title" className="text-lg font-semibold">¿Descartar la generación?</h2>
          <p className="mt-1 text-sm text-ink-muted">{weekLabel}</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p id="discard-description" className="text-sm text-ink-muted">
            Se eliminarán todas las asignaciones automáticas, manuales y confirmadas de ambas salas.
            Las partes y las salas se conservarán.
          </p>
          <p id="discard-warning" className="border border-danger-light bg-danger/10 p-3 text-sm font-medium text-danger-light">
            Esta acción no se puede deshacer.
          </p>
          {discardError && <p role="alert" className="text-sm text-danger-light">{discardError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" autoFocus onClick={() => discardDialog.current?.close()} disabled={discarding} className="inline-flex min-h-11 items-center justify-center border border-line px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={discard} disabled={discarding} className="inline-flex min-h-11 items-center justify-center bg-danger px-4 py-2.5 text-sm font-semibold text-white hover:bg-danger/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-light disabled:opacity-50">
              {discarding ? 'Eliminando...' : 'Eliminar asignaciones'}
            </button>
          </div>
        </div>
      </dialog>
      <div role="status" aria-live="polite" aria-atomic="true" className={`mt-3 min-h-5 text-sm ${feedback?.kind === 'error' ? 'text-danger-light' : 'text-ink-muted'}`}>
        {feedback?.text}
      </div>
    </div>
  );
}
