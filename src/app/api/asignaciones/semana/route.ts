import { NextResponse } from 'next/server';
import { getAssignmentsRepository } from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const weeks = await getAssignmentsRepository().listWeeks();
    return NextResponse.json(weeks);
  } catch (error) {
    console.error('Error al listar semanas:', error);
    return NextResponse.json(errorPayload(error), {
      status: httpStatusForError(error),
    });
  }
}