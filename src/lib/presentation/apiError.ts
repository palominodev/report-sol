import { ValidationError } from '@/core/domain/errors/ValidationError';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ConflictError } from '@/core/domain/errors/ConflictError';
import { UnprocessableError } from '@/core/domain/errors/UnprocessableError';

export function httpStatusForError(err: unknown): number {
  if (err instanceof ValidationError) return 400;
  if (err instanceof NotFoundError) return 404;
  if (err instanceof ConflictError) return 409;
  if (err instanceof UnprocessableError) return 422;
  return 500;
}

export function errorPayload(err: unknown): { error: string } {
  return { error: err instanceof Error ? err.message : 'Error interno del servidor' };
}