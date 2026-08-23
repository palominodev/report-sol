'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConfirmButtonProps {
  idWeek: number;
}

export default function ConfirmButton({ idWeek }: ConfirmButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'warning'; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
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
        setMessage({ kind: 'success', text: `${data.confirmed} asignaciones confirmadas` });
      }
      router.refresh();
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Error al confirmar la semana',
      });
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
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-50"
      >
        {loading ? 'Confirmando...' : 'Confirmar semana'}
      </button>
      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : undefined}
          className={`mt-2 text-sm ${
            message.kind === 'error'
              ? 'text-red-700'
              : message.kind === 'warning'
              ? 'text-amber-700'
              : 'text-green-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}