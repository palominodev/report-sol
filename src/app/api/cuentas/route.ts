import { NextRequest, NextResponse } from 'next/server';
import { getAccountRepository, getCreateAccountUseCase } from '@/infrastructure/config/di';
import { withAuth } from '@/lib/auth/server';
import { accountErrorResponse } from './http-errors';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async () => {
    try {
      return NextResponse.json({ cuentas: await getAccountRepository().findAll() });
    } catch (error) {
      return accountErrorResponse(error);
    }
  },
  { role: 'administrador' }
);

export const POST = withAuth(
  async (request: NextRequest) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }

    const { username, password, rol } = (body ?? {}) as Record<string, unknown>;
    if (typeof username !== 'string' || typeof password !== 'string' || typeof rol !== 'string') {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }

    try {
      const cuenta = await getCreateAccountUseCase().execute({
        username,
        password,
        rol: rol as 'administrador' | 'normal',
      });
      return NextResponse.json({ cuenta }, { status: 201 });
    } catch (error) {
      return accountErrorResponse(error);
    }
  },
  { role: 'administrador' }
);
