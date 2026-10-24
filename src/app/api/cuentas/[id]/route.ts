import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountRepository,
  getDeactivateAccountUseCase,
  getReactivateAccountUseCase,
} from '@/infrastructure/config/di';
import { withAuth } from '@/lib/auth/server';
import { accountErrorResponse } from '../http-errors';

export const dynamic = 'force-dynamic';

const INVALID_REQUEST = { error: 'La solicitud no es válida.' };

export const PATCH = withAuth(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: rawId } = await params;
    // Digits only: rejects "1.5", "1e3", "-1", "abc" and other shapes Number() would accept.
    if (!/^[1-9][0-9]{0,14}$/.test(rawId)) {
      return NextResponse.json(INVALID_REQUEST, { status: 400 });
    }
    const id = Number(rawId);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(INVALID_REQUEST, { status: 400 });
    }
    const activa = (body as Record<string, unknown> | null)?.activa;
    if (typeof activa !== 'boolean') {
      return NextResponse.json(INVALID_REQUEST, { status: 400 });
    }

    try {
      if (activa) await getReactivateAccountUseCase().execute(id);
      else await getDeactivateAccountUseCase().execute(id);
      return NextResponse.json({ cuenta: await getAccountRepository().findById(id) });
    } catch (error) {
      return accountErrorResponse(error);
    }
  },
  { role: 'administrador' }
);
