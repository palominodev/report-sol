import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/server';
import { CreateInformeUseCase, GetInformesUseCase } from '@/core/application/use-cases';
import { getInformeRepository } from '@/infrastructure/config/di';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import type { InformeCreateData } from '@/core/domain/repositories/IInformeRepository';

export const GET = withAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const añoParam = searchParams.get('año');
    const mes = searchParams.get('mes') || null;
    const rol = searchParams.get('rol') || null;
    const grupoParam = searchParams.get('grupo');

    let año: number | null = null;
    if (añoParam !== null && añoParam !== '') {
      año = Number(añoParam);
      if (isNaN(año)) {
        return NextResponse.json({ error: 'El parámetro "año" debe ser un número válido.' }, { status: 400 });
      }
    }

    let grupo: number | null = null;
    if (grupoParam !== null && grupoParam !== '') {
      grupo = Number(grupoParam);
      if (isNaN(grupo)) {
        return NextResponse.json({ error: 'El parámetro "grupo" debe ser un número válido.' }, { status: 400 });
      }
    }

    const repo = getInformeRepository();
    const useCase = new GetInformesUseCase(repo);
    const result = await useCase.execute({ año, mes, rol, grupo });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener informes:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al obtener informes' }, { status: 500 });
  }
});

// Public on purpose (S7): anyone can send a report. This is the ONLY unguarded method on this route;
// the access policy (src/lib/auth/access-policy.ts) lists exactly `POST /api/informe`.
export async function POST(request: Request) {
  try {
    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }

    const informeRepository = getInformeRepository();
    const createInformeUseCase = new CreateInformeUseCase(informeRepository);

    const createdInforme = await createInformeUseCase.execute(data as InformeCreateData);

    return NextResponse.json(createdInforme, { status: 201 });
  } catch (error) {
    console.error('Error al crear informe:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear el informe' }, { status: 500 });
  }
}
