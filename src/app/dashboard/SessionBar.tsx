'use client';

import { useState } from 'react';
import { logout } from './cuentas/accounts-client';

/** Sign-out control of the session bar (the bar itself is rendered by the layout). */
export default function SessionBar() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await logout();
    if (result.ok) {
      window.location.assign('/login');
      return;
    }
    setBusy(false);
    setError('No se pudo cerrar la sesión. Intentá de nuevo.');
  }

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        aria-busy={busy}
        className="inline-flex h-9 cursor-pointer items-center justify-center bg-brand px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {busy ? 'Cerrando…' : 'Cerrar sesión'}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm font-medium text-danger-light sm:w-auto">
          {error}
        </p>
      )}
    </>
  );
}
