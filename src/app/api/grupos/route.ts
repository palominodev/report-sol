import { NextResponse } from 'next/server';
import { GetGruposUseCase } from '@/core/application/use-cases/GetGruposUseCase';
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
