import { NextResponse } from 'next/server';
import { getConfirmWeekAssignmentsUseCase } from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const idWeek = Number(id);
    const result = await getConfirmWeekAssignmentsUseCase().execute({ id_week: idWeek });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al confirmar semana:', error);
    return NextResponse.json(errorPayload(error), {
      status: httpStatusForError(error),
    });
  }
}