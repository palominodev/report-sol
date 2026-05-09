import { NextResponse } from 'next/server';
import { GetGruposUseCase } from '@/core/application/use-cases/GetGruposUseCase';
import { CreateGrupoUseCase } from '@/core/application/use-cases/CreateGrupoUseCase';
import { DeleteGrupoUseCase } from '@/core/application/use-cases/DeleteGrupoUseCase';
import { TursoGrupoRepository } from '@/infrastructure/persistence/turso-grupo.repository';

export async function GET() {
  try {
    const grupoRepository = new TursoGrupoRepository();
    const getGruposUseCase = new GetGruposUseCase(grupoRepository);
    const grupos = await getGruposUseCase.executeWithDetails();
    return NextResponse.json(grupos);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { nombre } = await request.json();
    const grupoRepository = new TursoGrupoRepository();
    const createGrupoUseCase = new CreateGrupoUseCase(grupoRepository);
    const grupo = await createGrupoUseCase.execute(nombre);
    return NextResponse.json(grupo, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const grupoRepository = new TursoGrupoRepository();
    const deleteGrupoUseCase = new DeleteGrupoUseCase(grupoRepository);
    await deleteGrupoUseCase.execute(Number(id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
