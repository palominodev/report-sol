'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { Account, AccountRole } from '@/core/domain/auth/Account';
import { createAccount, setAccountActive, type Failure } from './accounts-client';

const inputClasses =
  'h-11 w-full border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted ' +
  'transition-colors motion-reduce:transition-none ' +
  'focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 ' +
  'aria-[invalid=true]:border-danger-light';
const labelClasses = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-ink-muted';
const hintClasses = 'mt-1 text-xs text-ink-muted';
const ghostButton =
  'inline-flex h-9 cursor-pointer items-center justify-center border border-line bg-transparent px-3 text-sm font-semibold text-ink transition-colors hover:bg-nav disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30';
const dangerButton =
  'inline-flex h-9 cursor-pointer items-center justify-center border border-danger px-3 text-sm font-semibold text-ink transition-colors hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/40';

interface Props {
  accounts: Account[];
  currentAccountId: number;
}

interface RowState {
  busy?: boolean;
  error?: string;
}

export default function AccountsManager({ accounts: initial, currentAccountId }: Props) {
  const uid = useId();
  const formErrorId = `${uid}-error`;
  const usernameHintId = `${uid}-username-hint`;
  const passwordHintId = `${uid}-password-hint`;

  const usernameRef = useRef<HTMLInputElement>(null);
  const actionRefs = useRef(new Map<number, HTMLButtonElement | null>());
  const noRefs = useRef(new Map<number, HTMLButtonElement | null>());
  const pendingFocus = useRef<{ id: number; target: 'action' | 'no' } | null>(null);

  const [accounts, setAccounts] = useState(initial);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<AccountRole>('normal');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  // Moves focus after the DOM reflects the new row state (confirmation open/closed, button swapped).
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    (pending.target === 'no' ? noRefs : actionRefs).current.get(pending.id)?.focus();
  });

  function goToLogin() {
    window.location.assign('/login?next=/dashboard/cuentas');
  }

  function patchRow(id: number, state: RowState) {
    setRows((current) => ({ ...current, [id]: state }));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setFormError(null);
    setStatus('');

    const result = await createAccount({ username, password, rol });
    setCreating(false);

    if (result.ok) {
      setAccounts((current) => [...current, result.cuenta]);
      setUsername('');
      setPassword('');
      setRol('normal');
      setStatus(`Cuenta "${result.cuenta.username}" creada.`);
      usernameRef.current?.focus();
      return;
    }
    if (result.kind === 'unauthorized') return goToLogin();
    setFormError(result.message);
    setPassword('');
  }

  async function changeActive(account: Account, activa: boolean) {
    patchRow(account.id, { busy: true });
    setStatus('');
    setConfirmingId(null);

    const result = await setAccountActive(account.id, activa);
    if (result.ok) {
      setAccounts((current) => current.map((a) => (a.id === account.id ? result.cuenta : a)));
      patchRow(account.id, {});
      pendingFocus.current = { id: account.id, target: 'action' };
      setStatus(
        activa
          ? `Cuenta "${account.username}" reactivada. La contraseña anterior vuelve a funcionar.`
          : `Cuenta "${account.username}" desactivada.`
      );
      return;
    }
    handleRowFailure(account.id, result);
  }

  function handleRowFailure(id: number, failure: Failure) {
    if (failure.kind === 'unauthorized') return goToLogin();
    patchRow(id, { error: failure.message });
    pendingFocus.current = { id, target: 'action' };
  }

  function askConfirmation(id: number) {
    patchRow(id, {});
    pendingFocus.current = { id, target: 'no' };
    setConfirmingId(id);
  }

  function cancelConfirmation(id: number) {
    pendingFocus.current = { id, target: 'action' };
    setConfirmingId(null);
  }

  return (
    <div className="min-h-screen bg-page font-[family-name:Helvetica,Arial,sans-serif] text-ink">
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <header className="border border-line bg-surface px-5 py-4">
          <Link
            href="/dashboard"
            className="mb-2 inline-block text-sm font-semibold text-brand-light hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold leading-tight text-ink">Cuentas</h1>
          <p className="text-sm text-ink-muted">Quién puede entrar a Report Sol.</p>
        </header>

        <div role="status" aria-live="polite" className={status ? 'border border-line bg-surface px-4 py-3 text-sm text-ink' : 'sr-only'}>
          {status}
        </div>

        <section aria-labelledby={`${uid}-new`} className="border border-line bg-surface px-5 py-4">
          <h2 id={`${uid}-new`} className="mb-3 text-base font-bold text-ink">Crear cuenta</h2>
          <form onSubmit={handleCreate} aria-describedby={formError ? formErrorId : undefined} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-username`} className={labelClasses}>Usuario</label>
              <input
                ref={usernameRef}
                id={`${uid}-username`}
                name="username"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-describedby={usernameHintId}
                aria-invalid={formError ? true : undefined}
                className={inputClasses}
              />
              <p id={usernameHintId} className={hintClasses}>3 a 32 caracteres: letras sin acentos, números, punto, guion o guion bajo</p>
            </div>
            <div>
              <label htmlFor={`${uid}-password`} className={labelClasses}>Contraseña</label>
              <input
                id={`${uid}-password`}
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={passwordHintId}
                aria-invalid={formError ? true : undefined}
                className={inputClasses}
              />
              <p id={passwordHintId} className={hintClasses}>Mínimo 10 caracteres. Compartísela a la persona por un medio seguro.</p>
            </div>
            <div>
              <label htmlFor={`${uid}-rol`} className={labelClasses}>Tipo de cuenta</label>
              <select
                id={`${uid}-rol`}
                name="rol"
                value={rol}
                onChange={(e) => setRol(e.target.value as AccountRole)}
                className={`${inputClasses} cursor-pointer`}
              >
                <option value="normal">Normal</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                aria-busy={creating}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:w-auto"
              >
                {creating ? 'Creando…' : 'Crear cuenta'}
              </button>
            </div>
            {formError && (
              <p id={formErrorId} role="alert" className="border border-danger/50 bg-danger/10 px-4 py-3 text-sm font-medium text-ink sm:col-span-2">
                {formError}
              </p>
            )}
          </form>
        </section>

        <section aria-labelledby={`${uid}-list`} className="border border-line bg-surface">
          <h2 id={`${uid}-list`} className="px-5 py-4 text-base font-bold text-ink">
            Todas las cuentas <span className="font-normal text-ink-muted">({accounts.length})</span>
          </h2>
          {accounts.length === 0 ? (
            <p className="border-t border-line px-5 py-4 text-sm text-ink-muted">Todavía no hay cuentas.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {accounts.map((account) => {
                const row = rows[account.id] ?? {};
                const isMe = account.id === currentAccountId;
                const confirming = confirmingId === account.id;
                const errorId = `${uid}-row-${account.id}-error`;
                return (
                  <li
                    key={account.id}
                    className={`px-5 py-3 ${account.activa ? '' : 'bg-page/40 text-ink-muted'}`}
                    onKeyDown={confirming ? (e) => { if (e.key === 'Escape') { e.stopPropagation(); cancelConfirmation(account.id); } } : undefined}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className={`break-words text-sm font-semibold ${account.activa ? 'text-ink' : 'text-ink-muted line-through decoration-1'}`}>
                          {account.username}
                          {isMe && <span className="ml-2 border border-line px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-light">Tu cuenta</span>}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {account.rol === 'administrador' ? 'Administrador' : 'Normal'}
                          <span aria-hidden="true"> · </span>
                          <span className="sr-only">, </span>
                          <span className={account.activa ? 'font-semibold text-ink' : 'font-semibold'}>{account.activa ? 'Activa' : 'Desactivada'}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isMe ? null : confirming ? (
                          <div role="group" aria-label={`Confirmar desactivar ${account.username}`} className="flex flex-wrap items-center gap-2">
                            <span id={`${uid}-confirm-${account.id}`} className="text-sm text-ink">¿Desactivar?</span>
                            <button type="button" onClick={() => changeActive(account, false)} disabled={row.busy} aria-describedby={`${uid}-consequence-${account.id}`} className={dangerButton}>Sí</button>
                            <button type="button" ref={(el) => { noRefs.current.set(account.id, el); }} onClick={() => cancelConfirmation(account.id)} disabled={row.busy} className={ghostButton}>No</button>
                          </div>
                        ) : account.activa ? (
                          <button type="button" ref={(el) => { actionRefs.current.set(account.id, el); }} onClick={() => askConfirmation(account.id)} disabled={row.busy} aria-label={`Desactivar ${account.username}`} className={ghostButton}>
                            {row.busy ? 'Desactivando…' : 'Desactivar'}
                          </button>
                        ) : (
                          <button type="button" ref={(el) => { actionRefs.current.set(account.id, el); }} onClick={() => changeActive(account, true)} disabled={row.busy} aria-label={`Reactivar ${account.username}`} className={ghostButton}>
                            {row.busy ? 'Reactivando…' : 'Reactivar'}
                          </button>
                        )}
                      </div>
                    </div>
                    {confirming && (
                      <p id={`${uid}-consequence-${account.id}`} className="mt-2 text-sm text-ink">
                        Esta persona perderá el acceso ahora mismo y se cerrará su sesión.
                      </p>
                    )}
                    {row.error && (
                      <p id={errorId} role="alert" className="mt-2 border border-danger/50 bg-danger/10 px-3 py-2 text-sm font-medium text-ink">
                        {row.error}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-ink-muted">¿Olvidó su contraseña? Restablecela con: pnpm account reset-password &lt;usuario&gt;</p>
      </main>
    </div>
  );
}
