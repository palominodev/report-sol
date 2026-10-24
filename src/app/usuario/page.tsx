import { redirect } from 'next/navigation';
import { requireAccount } from '@/lib/auth/server';

export default async function UsuarioPage() {
  await requireAccount();
  redirect('/dashboard/publicadores');
}
