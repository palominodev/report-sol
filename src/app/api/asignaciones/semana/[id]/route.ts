import { NextResponse } from 'next/server';
import { getGetWeekAssignmentsUseCase, getUserRepository } from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const idWeek = Number(id);
    const result = await getGetWeekAssignmentsUseCase().execute({ id_week: idWeek });
    // Users projection so the client can populate the assignee pickers.
    const users = await getUserRepository().findAllAssignable();
    return NextResponse.json({ ...result, users });
  } catch (error) {
    console.error('Error al obtener semana:', error);
    return NextResponse.json(errorPayload(error), {
      status: httpStatusForError(error),
    });
  }
}