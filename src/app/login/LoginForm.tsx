'use client';

import { useId, useRef, useState } from 'react';
import { signInWithPassword } from './login-client';

const inputClasses =
  'h-11 w-full border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted ' +
  'transition-colors motion-reduce:transition-none ' +
  'focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 ' +
  'aria-[invalid=true]:border-danger-light';

const labelClasses = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted';

interface LoginFormProps {
  /** Already validated on the server: always a same-site path. */
  redirectTo: string;
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const errorId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPassword(username, password);

      if (result.ok) {
        // Full navigation so the server renders the protected page with the new session.
        window.location.assign(redirectTo);
        return;
      }

      setError(result.message);
      // Keep the username so only the password has to be retyped.
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-describedby={error ? errorId : undefined}>
      <div>
        <label htmlFor="login-username" className={labelClasses}>
          Usuario
        </label>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="login-password" className={labelClasses}>
          Contraseña
        </label>
        <input
          id="login-password"
          ref={passwordRef}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={inputClasses}
        />
      </div>

      <div id={errorId} role="alert" aria-live="assertive" className="min-h-5 text-sm text-danger-light">
        {error}
      </div>

      <button
        type="submit"
        disabled={loading || !username.trim() || !password}
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
