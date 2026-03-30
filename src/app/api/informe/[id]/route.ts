import { NextResponse } from 'next/server';
import { UpdateInformeUseCase } from '@/core/application/use-cases/UpdateInformeUseCase';
import { DeleteInformeUseCase } from '@/core/application/use-cases/DeleteInformeUseCase';
import { TursoInformeRepository } from '@/infrastructure/persistence/turso-informe.repository';

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
    const informeRepository = new TursoInformeRepository();
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
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const informeRepository = new TursoInformeRepository();
    const deleteInformeUseCase = new DeleteInformeUseCase(informeRepository);

    await deleteInformeUseCase.execute(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar informe:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
