import { NextResponse } from 'next/server';
import { getOverrideAssignmentUseCase } from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Manual override of one assignment slot.
 *
 * Contract (single coherent shape):
 *   PATCH /api/asignacion/:idPart
 *   body: { rol: 'presentador' | 'companero', id_usuario: number }
 *   success 200 → { assignment, warnings[] }
 *   hard-invariant violation → 400 { error }
 *   part not found → 404 { error }
 *
 * The path `:id` maps to OverrideAssignmentUseCase input `id_part` — the route
 * supports a manual swap of the person fulfilling a given role on a part.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const idPart = Number(id);
    const rol = body.rol as 'presentador' | 'companero';
    const idUsuario = Number(body.id_usuario);

    const result = await getOverrideAssignmentUseCase().execute({
      id_part: idPart,
      rol,
      id_usuario: idUsuario,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al sobrescribir asignación:', error);
    return NextResponse.json(errorPayload(error), {
      status: httpStatusForError(error),
    });
  }
}