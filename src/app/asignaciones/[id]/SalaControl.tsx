'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SalaControlProps {
  idPart: number;
  current: 'A' | 'B' | null;
}

/**
 * Per-part sala stamper: A / B / '—' (clear). Cloned from OverrideControl's
 * interaction contract — loading disables the controls, inline alert on
 * failure, router.refresh() on success — with two deliberate deltas:
 *
 *  1. Submit is allowed on '—' — clearing is a valid write (sala: null).
 *  2. While a PATCH is in flight the select shows the PERSISTED value
 *     (`current`), never the pending one (no optimistic update).
 */
export default function SalaControl({ idPart, current }: SalaControlProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(current ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/asignacion/${idPart}/sala`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala: selected === '' ? null : selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Invalid sala / missing part / malformed body come back as 4xx.
        throw new Error(data.error || 'Error al guardar sala');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar sala');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label htmlFor={`sala-${idPart}`} className="text-sm font-medium text-slate-500">
        Sala
      </label>
      <select
        id={`sala-${idPart}`}
        value={loading ? (current ?? '') : selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
        className="h-9 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition-colors focus:outline-none focus-visible:border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-800/30 disabled:opacity-50"
      >
        <option value="">—</option>
        <option value="A">A</option>
        <option value="B">B</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
