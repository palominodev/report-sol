import { NextResponse } from 'next/server';
import {
  getAdoptSalaRoomsUseCase,
  getGenerateWeekAssignmentsUseCase,
  getGetWeekAssignmentsUseCase,
} from '@/infrastructure/config/di';
import { httpStatusForError, errorPayload } from '@/lib/presentation/apiError';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import {
  AdoptSalaRoomsResult,
  SALA_POLICIES,
  SalaPolicy,
} from '@/core/application/use-cases/presentation/AdoptSalaRoomsUseCase';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Parses the (optional) request body into `{ salaPolicy? }`.
 *
 * Strict-parse contract (sala-route precedent): an empty body means "no
 * policy given", but a NON-EMPTY malformed body is a client error → 400.
 * A present-but-invalid salaPolicy value is rejected before any use case runs.
 */
function parseBody(raw: string): { salaPolicy?: SalaPolicy } {
  if (raw.trim().length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('El cuerpo de la petición no es JSON válido');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ValidationError('El cuerpo de la petición debe ser un objeto JSON');
  }
  const { salaPolicy } = parsed as { salaPolicy?: unknown };
  if (salaPolicy !== undefined && !(SALA_POLICIES as readonly string[]).includes(salaPolicy as string)) {
    throw new ValidationError(`salaPolicy inválida: ${String(salaPolicy)} (valores válidos: ${SALA_POLICIES.join(' | ')})`);
  }
  return { salaPolicy: salaPolicy as SalaPolicy | undefined };
}

/**
 * Generates a week's assignments, adopting unassigned parts into the mirrored
 * A/B layout first when the client provides a policy.
 *
 * Contract:
 *   POST /api/asignaciones/semana/:idWeek/generar
 *   body (optional): { salaPolicy?: 'adopt_and_clone' | 'rebuild' }
 *   success 200 → { assignments, unassigned, adoption? }  (adoption summary
 *   present only when a policy was applied)
 *   malformed JSON / non-object body / non-enum salaPolicy → 400 { error }
 *   NULL-sala parts present and no policy given → 400 { error }
 *   unknown week → 404 { error } (via GetWeekAssignmentsUseCase)
 *
 * The NULL-sala part count is computed through GetWeekAssignmentsUseCase —
 * routes never touch repositories directly.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const idWeek = Number(id);

    const { salaPolicy } = parseBody(await request.text());

    const current = await getGetWeekAssignmentsUseCase().execute({ id_week: idWeek });
    const nullSalaParts = current.parts.filter((p) => p.sala === null).length;

    if (nullSalaParts > 0 && salaPolicy === undefined) {
      throw new ValidationError(
        `La semana tiene ${nullSalaParts} parte(s) sin sala asignada; indica salaPolicy (${SALA_POLICIES.join(' | ')})`
      );
    }

    let adoption: AdoptSalaRoomsResult | undefined;
    if (salaPolicy !== undefined) {
      adoption = await getAdoptSalaRoomsUseCase().execute({ id_week: idWeek, policy: salaPolicy });
    }

    const result = await getGenerateWeekAssignmentsUseCase().execute({ id_week: idWeek });
    return NextResponse.json(adoption === undefined ? result : { ...result, adoption });
  } catch (error) {
    console.error('Error al generar asignaciones:', error);
    return NextResponse.json(errorPayload(error), {
      status: httpStatusForError(error),
    });
  }
}
