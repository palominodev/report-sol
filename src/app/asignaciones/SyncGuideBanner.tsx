'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface GuideSyncState {
  hasNewer: boolean;
  latestLoaded: string | null;
  latestPublished: string | null;
  lastCheckedAt: string | null;
}

interface SyncGuideBannerProps {
  initialState: GuideSyncState;
}

export default function SyncGuideBanner({ initialState }: SyncGuideBannerProps) {
  const router = useRouter();
  const [syncState, setSyncState] = useState<GuideSyncState>(initialState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSync = async (issueToSync?: string) => {
    setIsSyncing(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/asignaciones/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueToSync ? { issue: issueToSync } : {}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al sincronizar la guía');
      }

      setFeedback({
        type: 'success',
        message: `¡Guía sincronizada con éxito! ${data.weeksLoaded} semana${
          data.weeksLoaded !== 1 ? 's' : ''
        } y ${data.partsLoaded} asignaciones cargadas (${data.issue}).`,
      });

      setSyncState((prev) => ({
        ...prev,
        latestLoaded: data.issue,
        hasNewer: false,
      }));

      router.refresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al sincronizar la guía',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/asignaciones/guide-check?force=true');
      const data: GuideSyncState = await response.json();

      if (!response.ok) {
        throw new Error('Error al consultar actualizaciones');
      }

      setSyncState(data);
      if (data.hasNewer) {
        setFeedback({
          type: 'success',
          message: `Nueva edición encontrada en jw.org: ${data.latestPublished}`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Tu guía de actividades está al día con la última publicación.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al verificar actualizaciones',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner for newer published guide */}
      {syncState.hasNewer && syncState.latestPublished && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-amber-900">
                Nueva guía de actividades disponible: {syncState.latestPublished}
              </p>
              <p className="text-xs text-amber-800">
                {syncState.latestLoaded
                  ? `Edición actual cargada: ${syncState.latestLoaded}`
                  : 'Aún no has sincronizado ninguna edición.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSync(syncState.latestPublished || undefined)}
            disabled={isSyncing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Sincronizando...</span>
              </>
            ) : (
              <span>Sincronizar ahora</span>
            )}
          </button>
        </div>
      )}

      {/* Sync Control Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {syncState.latestLoaded
                ? `Edición cargada: ${syncState.latestLoaded}`
                : 'Sin guía de actividades cargada'}
            </div>
            <div className="text-xs text-slate-500">
              {syncState.lastCheckedAt
                ? `Última comprobación: ${new Date(syncState.lastCheckedAt).toLocaleDateString()} ${new Date(
                    syncState.lastCheckedAt
                  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No se ha comprobado recientemente'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCheckUpdate}
            disabled={isChecking || isSyncing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {isChecking && (
              <svg className="h-3.5 w-3.5 animate-spin text-slate-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>Buscar actualización</span>
          </button>

          <button
            type="button"
            onClick={() => handleSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900 disabled:opacity-50"
          >
            {isSyncing && (
              <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Guía'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast / Alert */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center justify-between rounded-lg p-3 text-sm ${
            feedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-2 text-xs font-bold opacity-60 hover:opacity-100"
            aria-label="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
