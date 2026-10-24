import { ValidationError } from '@/core/domain/errors/ValidationError';

export const MIN_PASSWORD_LENGTH = 10;

export function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
}
