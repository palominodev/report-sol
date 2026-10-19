'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AssignmentHistoryEntry } from '@/core/domain/presentations/AssignmentHistory';
import AssignmentHistory from './AssignmentHistory';
import ParticipantPicker from './ParticipantPicker';

export interface OverrideUser {
  id_usuario: number;
  nombre: string;
  apellido: string;
  genero: string | null;
  assignmentHistory?: AssignmentHistoryEntry[];
  /** e.g. "Hace 3 meses y 12 días que no participa"; shown next to the name. */
  participationLabel?: string;
}

interface OverrideControlProps {
  idWeek: number;
  idPart: number;
  rol: 'presentador' | 'companero';
  currentIdUsuario: number | null;
  users: OverrideUser[];
}

interface ApiWarning {
  code: string;
  message: string;
}

export default function OverrideControl({ idWeek, idPart, rol, currentIdUsuario, users }: OverrideControlProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentIdUsuario?.toString() ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ApiWarning[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await fetch(`/api/asignacion/${idPart}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, id_usuario: Number(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Hard-invariant violations come back as 400 (blocked).
        throw new Error(data.error || 'Error al asignar');
      }
      if (data.warnings && Array.isArray(data.warnings)) {
        setWarnings(data.warnings);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar');
    } finally {
      setLoading(false);
    }
  }

  const rolLabel = rol === 'presentador' ? 'Presentador' : 'Compañero';
  const selectedUser = users.find(user => user.id_usuario === Number(selected));
  const showCandidateHistory = selectedUser && selectedUser.id_usuario !== currentIdUsuario;
  const historyId = `candidate-history-${idPart}-${rol}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-t border-line pt-3">
      <label id={`override-${idPart}-${rol}-label`} htmlFor={`override-${idPart}-${rol}`} className="block text-xs font-medium text-ink-muted">
        {currentIdUsuario ? 'Cambiar' : 'Elegir'} {rolLabel.toLowerCase()}
      </label>
      <div className="flex items-center gap-2">
        <ParticipantPicker
          id={`override-${idPart}-${rol}`}
          users={users}
          value={selected}
          currentId={currentIdUsuario}
          disabled={loading}
          describedBy={showCandidateHistory ? historyId : undefined}
          onChange={setSelected}
        />
        <button
          type="submit"
          disabled={loading || !selected}
          className="inline-flex min-h-11 shrink-0 items-center justify-center border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-nav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Asignar'}
        </button>
      </div>
      {showCandidateHistory && (
        <div id={historyId} aria-live="polite" aria-atomic="true">
          <AssignmentHistory history={selectedUser.assignmentHistory ?? []} idWeek={idWeek} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger-light">
          {error}
        </p>
      )}
      {warnings.map((w) => (
        <p key={w.code} className="text-sm text-amber-300">
          {w.message}
        </p>
      ))}
    </form>
  );
}