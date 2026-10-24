import Link from 'next/link';
import { requireAccount } from '@/lib/auth/server';
import SessionBar from './SessionBar';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount();
  return (
    <>
      <div className="border-b border-line bg-surface font-[family-name:Helvetica,Arial,sans-serif] text-ink">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <p className="min-w-0 break-words text-sm text-ink-muted">
            Sesión: <span className="font-semibold text-ink">{account.username}</span>
          </p>
          <nav aria-label="Sesión" className="flex flex-wrap items-center gap-2">
            {account.rol === 'administrador' && (
              <Link
                href="/dashboard/cuentas"
                className="inline-flex h-9 cursor-pointer items-center justify-center border border-line bg-transparent px-3 text-sm font-semibold text-ink transition-colors hover:bg-nav motion-reduce:transition-none focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                Cuentas
              </Link>
            )}
            <SessionBar />
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
