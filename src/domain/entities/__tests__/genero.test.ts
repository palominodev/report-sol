import { describe, it, expect } from 'vitest';
import { normalizeGenero } from '@/domain/entities/User';
import { ValidationError } from '@/core/domain/errors/ValidationError';

describe('normalizeGenero', () => {
  it('normalizes "masculino" to itself', () => {
    expect(normalizeGenero('masculino')).toBe('masculino');
  });

  it('normalizes "femenino" to itself', () => {
    expect(normalizeGenero('femenino')).toBe('femenino');
  });

  it('lowercases and trims "  FEMENINO " to femenino', () => {
    expect(normalizeGenero('  FEMENINO ')).toBe('femenino');
  });

  it('returns null for undefined (backfill deferred)', () => {
    expect(normalizeGenero(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(normalizeGenero('')).toBeNull();
  });

  it('entry stays ineligible: throws ValidationError for an invalid value', () => {
    expect(() => normalizeGenero('otro')).toThrow(ValidationError);
  });
});