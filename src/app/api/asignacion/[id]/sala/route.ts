import { NextResponse } from 'next/server';
import { getSetPartSalaUseCase } from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { Sala } from '@/domain/entities/presentation/enums';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Stamps or clears a part's sala.
 *
 * Contract:
 *   PATCH /api/asignacion/:idPart/sala
 *   body: { sala: 'A' | 'B' | null }
 *   success 200 → { success: true }
 *   invalid sala or non-JSON body → 400 { error }
 *   part not found (incl. non-numeric id) → 404 { error }
 *
 * Deliberate delta vs the sibling [id]/route.ts: a malformed JSON body is a
 * client error and maps to 400 here, not the sibling's unguarded 500.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const idPart = Number(id);

    let body: { sala?: Sala | null };
    try {
      body = (await request.json()) as { sala?: Sala | null };
    } catch {
      throw new ValidationError('El cuerpo de la petición no es JSON válido');
    }

    // Explicit JSON null clears; a MISSING sala key is malformed input and
    // must not silently clear — reject before reaching the use case contract.
    if (body.sala === undefined) {
      throw new ValidationError('Falta el campo sala (valores válidos: "A", "B" o null)');
    }

    await getSetPartSalaUseCase().execute({
      id_part: idPart,
      sala: body.sala,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar sala:', error);
    return NextResponse.json(errorPayload(error), {
      status: httpStatusForError(error),
    });
  }
}
