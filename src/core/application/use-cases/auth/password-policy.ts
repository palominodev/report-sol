import { ValidationError } from '@/core/domain/errors/ValidationError';

export const MIN_PASSWORD_LENGTH = 10;

/** Generous for passphrases, small enough that nobody can make the server hash megabytes. */
export const MAX_PASSWORD_LENGTH = 256;

/** Same upper bound as the account creation rule (3 to 32 characters). */
export const MAX_USERNAME_LENGTH = 32;

export function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
}
