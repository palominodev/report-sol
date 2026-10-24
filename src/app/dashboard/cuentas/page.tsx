import { requireAccount } from '@/lib/auth/server';
import { getAccountRepository } from '@/infrastructure/config/di';
import AccountsManager from './AccountsManager';

export const dynamic = 'force-dynamic';

export default async function CuentasPage() {
  const me = await requireAccount({ role: 'administrador' });
  const accounts = await getAccountRepository().findAll();
  return <AccountsManager accounts={accounts} currentAccountId={me.id} />;
}
