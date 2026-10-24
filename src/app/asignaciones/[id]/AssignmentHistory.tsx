'use client';

import { useRef, useState } from 'react';
import type { AssignmentHistoryEntry, AssignmentHistoryDetail } from '@/core/domain/presentations/AssignmentHistory';
import { presentationTypeLabel, salaLabel } from '@/lib/presentation/status';
import { authedFetch } from '@/lib/auth/authed-fetch';

function dateLabel(date: string) {
  return date.split('-').reverse().join('/');
}

function HistoryEntry({ entry, idWeek }: { entry: AssignmentHistoryEntry; idWeek: number }) {
  const [detail, setDetail] = useState<AssignmentHistoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  async function loadDetail() {
    if (detail || pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await authedFetch(`/api/asignaciones/semana/${idWeek}/historial/${entry.id_asignacion}`, { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) throw new Error(data?.error || 'No se pudo cargar esta asignación');
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar esta asignación');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <details className="group w-56 shrink-0 max-w-full border border-line bg-surface" onToggle={event => {
      if (event.currentTarget.open) void loadDetail();
    }}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-brand-light transition-colors duration-200 hover:bg-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light [&::-webkit-details-marker]:hidden">
        <span className="decoration-1 underline-offset-4 group-hover:underline">
          <time dateTime={entry.fecha_inicio}>{dateLabel(entry.fecha_inicio)}</time>
          {entry.fecha_fin !== entry.fecha_inicio && (
            <> — <time dateTime={entry.fecha_fin}>{dateLabel(entry.fecha_fin)}</time></>
          )}
        </span>
        <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-icon transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      {(loading || error || detail) && (
        <div className="border-t border-line px-3 py-3 text-xs text-ink-muted">
          {loading && <p role="status">Cargando detalles...</p>}
          {error && (
            <div className="space-y-2">
              <p role="alert" className="text-danger-light">{error}</p>
              <button type="button" onClick={() => void loadDetail()} className="min-h-11 bg-brand px-3 font-semibold text-ink transition-colors duration-200 hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light">
                Reintentar
              </button>
            </div>
          )}
          {detail && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wider">Parte</dt><dd className="text-ink">{presentationTypeLabel(detail.tipo)}</dd>
              <dt className="text-[11px] font-semibold uppercase tracking-wider">Rol</dt><dd className="text-ink">{detail.rol === 'presentador' ? 'Presentador' : 'Compañero'}</dd>
              <dt className="text-[11px] font-semibold uppercase tracking-wider">Sala</dt><dd className="text-ink">{salaLabel(detail.sala) ?? 'Sala no registrada'}</dd>
            </dl>
          )}
        </div>
      )}
    </details>
  );
}

export default function AssignmentHistory({ history, idWeek }: { history: AssignmentHistoryEntry[]; idWeek: number }) {
  return (
    <div className="border border-line bg-page px-3 py-3 font-[family-name:Helvetica,Arial,sans-serif] text-xs text-ink-muted scheme-dark">
      <p className="font-bold text-ink">Historial de asignaciones</p>
      {history.length > 0 ? (
        <div className="mt-2 flex items-start gap-2 overflow-x-auto p-1">
          {history.map(entry => <HistoryEntry key={`${idWeek}:${entry.id_asignacion}`} entry={entry} idWeek={idWeek} />)}
        </div>
      ) : (
        <p className="mt-1 text-sm">Sin antecedentes registrados</p>
      )}
    </div>
  );
}
