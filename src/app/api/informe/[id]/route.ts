import { NextResponse } from 'next/server';
import { UpdateInformeUseCase } from '@/core/application/use-cases/UpdateInformeUseCase';
import { DeleteInformeUseCase } from '@/core/application/use-cases/DeleteInformeUseCase';
import { getInformeRepository } from '@/infrastructure/config/di';
import { ValidationError } from '@/core/domain/errors/ValidationError';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const data = await request.json();
    const { id } = await params;
    const informeRepository = getInformeRepository();
    const updateInformeUseCase = new UpdateInformeUseCase(informeRepository);

    await updateInformeUseCase.execute(Number(id), {
      horas: data.horas ?? null,
      cursos: data.cursos,
      participacion: data.participacion,
      trabajo_como_auxiliar: data.trabajo_como_auxiliar ?? false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar informe:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al actualizar informe' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const informeRepository = getInformeRepository();
    const deleteInformeUseCase = new DeleteInformeUseCase(informeRepository);

    await deleteInformeUseCase.execute(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar informe:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al eliminar informe' }, { status: 500 });
  }
}
