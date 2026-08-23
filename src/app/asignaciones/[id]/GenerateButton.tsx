'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GenerateButtonProps {
  idWeek: number;
  label: string;
}

export default function GenerateButton({ idWeek, label }: GenerateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/asignaciones/semana/${idWeek}/generar`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data.unassigned && data.unassigned.length > 0) {
        setNotice(
          `${data.assignments?.length ?? 0} asignaciones generadas, ${data.unassigned.length} sin cubrir`
        );
      } else if (data.assignments) {
        setNotice(`${data.assignments.length} asignaciones generadas`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Error al generar asignaciones');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar asignaciones');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:opacity-50"
      >
        {loading ? 'Generando...' : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-2 text-sm text-slate-600">{notice}</p>
      )}
    </div>
  );
}