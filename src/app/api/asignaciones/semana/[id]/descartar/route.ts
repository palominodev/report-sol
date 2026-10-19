import { NextResponse } from 'next/server';
import { getDiscardWeekAssignmentsUseCase } from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/asignaciones/semana/:id/descartar
 * Deletes all assignments, including manual and confirmed, for this week only.
 * Parts and rooms are preserved; the week returns to no_generada.
 * 200 { discarded: number }; invalid ID 400; unknown week 404; failure 500.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getDiscardWeekAssignmentsUseCase().execute({ id_week: Number(id) });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al descartar generación:', error);
    return NextResponse.json(errorPayload(error), { status: httpStatusForError(error) });
  }
}
