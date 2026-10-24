import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getValidateSessionUseCase } from '@/infrastructure/config/di';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión - Report Sol',
};

// Depends on the session cookie, so it must never be prerendered.
export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectPath(Array.isArray(next) ? next[0] : next);

  // Someone who is already signed in has nothing to do here.
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (await getValidateSessionUseCase().execute(token)) {
    redirect(redirectTo);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10 text-ink">
      <div className="w-full max-w-sm border border-line bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Report Sol</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">Ingresá con tu usuario para continuar.</p>
        <LoginForm redirectTo={redirectTo} />
        <p className="mt-6 text-xs text-ink-muted">
          ¿Olvidaste tu contraseña? Pedile a un administrador que la restablezca.
        </p>
      </div>
    </main>
  );
}
