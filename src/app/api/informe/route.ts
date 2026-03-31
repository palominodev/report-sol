import { NextResponse } from 'next/server';
import { CreateInformeUseCase } from '@/core/application/use-cases/CreateInformeUseCase';
import { TursoInformeRepository } from '@/infrastructure/persistence/turso-informe.repository';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const informeRepository = new TursoInformeRepository();
    const createInformeUseCase = new CreateInformeUseCase(informeRepository);

    await createInformeUseCase.execute({
      horas: data.horas ?? null,
      cursos: data.cursos,
      año: data.año,
      mes: data.mes,
      participacion: data.participacion,
      id_usuario: data.id_usuario,
      trabajo_como_auxiliar: data.trabajo_como_auxiliar ?? false,
      notas: data.notas ?? null,
    });

    return NextResponse.json({ success: true, message: 'Informe guardado exitosamente.' });
  } catch (error) {
    console.error('Error al crear informe:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido al crear informe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
