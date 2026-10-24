import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/server';
import { GetUltimoInformeUseCase } from '@/core/application/use-cases/GetUltimoInformeUseCase';
import { getInformeRepository } from '@/infrastructure/config/di';

export const GET = withAuth(async () => {
  try {
    const informeRepository = getInformeRepository();
    const getUltimoInformeUseCase = new GetUltimoInformeUseCase(informeRepository);
    const ultimo = await getUltimoInformeUseCase.execute();
    return NextResponse.json(ultimo);
  } catch (error) {
    console.error('Error al obtener el último informe:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener el último informe' }, { status: 500 });
  }
});
