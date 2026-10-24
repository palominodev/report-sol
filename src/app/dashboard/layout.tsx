import { requireAccount } from '@/lib/auth/server';

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccount();
  return children;
}
