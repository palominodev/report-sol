import { describe, it, expect } from 'vitest';
import { httpStatusForError, errorPayload } from '../apiError';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ConflictError } from '@/core/domain/errors/ConflictError';
import { UnprocessableError } from '@/core/domain/errors/UnprocessableError';

describe('httpStatusForError', () => {
  it('maps ValidationError to 400', () => {
    expect(httpStatusForError(new ValidationError('bad'))).toBe(400);
  });

  it('maps NotFoundError to 404', () => {
    expect(httpStatusForError(new NotFoundError('not found'))).toBe(404);
  });

  it('maps ConflictError to 409', () => {
    expect(httpStatusForError(new ConflictError('conflict'))).toBe(409);
  });

  it('maps UnprocessableError to 422', () => {
    expect(httpStatusForError(new UnprocessableError('unprocessable'))).toBe(422);
  });

  it('maps any other error to 500', () => {
    expect(httpStatusForError(new Error('boom'))).toBe(500);
  });

  it('maps non-Error values to 500', () => {
    expect(httpStatusForError('string')).toBe(500);
  });
});

describe('errorPayload', () => {
  it('uses the error message for domain errors', () => {
    expect(errorPayload(new NotFoundError('Semana no encontrada'))).toEqual({
      error: 'Semana no encontrada',
    });
  });

  it('falls back to a generic message for non-Errors', () => {
    expect(errorPayload(null).error).toBe('Error interno del servidor');
  });
});