import { redirect } from 'next/navigation';

// Public (S7): the group list is the home page.
export const dynamic = 'force-dynamic';

export default async function GrupoPage() {
  redirect('/');
}
