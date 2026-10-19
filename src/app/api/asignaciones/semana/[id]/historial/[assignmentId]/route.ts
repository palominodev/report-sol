import { NextResponse } from 'next/server';
import { getAssignmentHistoryUseCase } from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';

export const dynamic = 'force-dynamic';

/**
 * GET /api/asignaciones/semana/:id/historial/:assignmentId
 * Loads one confirmed/manual assignment strictly before the selected week.
 * 200: AssignmentHistoryDetail; 400: invalid identifiers; 404: missing/out-of-scope record; 500: failure.
 * Read-only. Details are requested only when the person opens a history entry.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  try {
    const { id, assignmentId } = await params;
    const detail = await getAssignmentHistoryUseCase().getDetail({ id_week: Number(id), id_asignacion: Number(assignmentId) });
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(errorPayload(error), { status: httpStatusForError(error) });
  }
}
