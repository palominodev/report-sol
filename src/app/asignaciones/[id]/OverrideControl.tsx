'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface OverrideUser {
  id_usuario: number;
  nombre: string;
  apellido: string;
  genero: string | null;
}

interface OverrideControlProps {
  idPart: number;
  rol: 'presentador' | 'companero';
  currentIdUsuario: number | null;
  users: OverrideUser[];
}

interface ApiWarning {
  code: string;
  message: string;
}

export default function OverrideControl({ idPart, rol, currentIdUsuario, users }: OverrideControlProps) {
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor={`override-${idPart}-${rol}`} className="hidden">
        {rolLabel}
      </label>
      <select
        id={`override-${idPart}-${rol}`}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="h-9 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition-colors focus:outline-none focus-visible:border-blue-800 focus-visible:ring-2 focus-visible:ring-blue-800/30"
      >
        <option value="">Seleccionar</option>
        {users.map((u) => (
          <option key={u.id_usuario} value={u.id_usuario}>
            {u.nombre} {u.apellido}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading || !selected}
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Asignar'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      )}
      {warnings.map((w) => (
        <p key={w.code} className="text-sm text-amber-700 sm:col-span-2">
          {w.message}
        </p>
      ))}
    </form>
  );
}