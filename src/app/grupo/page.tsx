import { redirect } from 'next/navigation';
import { requireAccount } from '@/lib/auth/server';

export default async function GrupoPage() {
  await requireAccount();
  redirect('/');
}
