import { NextResponse } from 'next/server';
import { ConflictError } from '@/core/domain/errors/ConflictError';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { UnprocessableError } from '@/core/domain/errors/UnprocessableError';
import { ValidationError } from '@/core/domain/errors/ValidationError';

/** Maps a domain error to the HTTP answer. Anything unexpected becomes a generic 500. */
export function accountErrorResponse(error: unknown): Response {
  if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof ConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof UnprocessableError) return NextResponse.json({ error: error.message }, { status: 422 });

  console.error('Account management failed', error);
  return NextResponse.json({ error: 'No se pudo completar la operación. Intentá de nuevo.' }, { status: 500 });
}
