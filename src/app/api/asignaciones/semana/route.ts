import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/server';
import { getAssignmentsRepository } from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
  try {
    const weeks = await getAssignmentsRepository().listWeeks();
    return NextResponse.json(weeks);
  } catch (error) {
    console.error('Error al listar semanas:', error);
    return NextResponse.json(errorPayload(error), {
      status: httpStatusForError(error),
    });
  }
});