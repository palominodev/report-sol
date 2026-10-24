import type { Account, AccountRole } from '@/core/domain/auth/Account';
import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { IPasswordHasher } from '@/core/domain/auth/IPasswordHasher';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { assertValidPassword } from './password-policy';

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;
const ROLES: readonly AccountRole[] = ['administrador', 'normal'];

export interface CreateAccountInput {
  username: string;
  password: string;
  rol: AccountRole;
}

export class CreateAccountUseCase {
  constructor(
    private readonly accounts: IAccountRepository,
    private readonly hasher: IPasswordHasher
  ) {}

  /** @throws ValidationError for bad input, ConflictError when the username is taken. */
  async execute(input: CreateAccountInput): Promise<Account> {
    const username = input.username.trim();
    if (!USERNAME_PATTERN.test(username)) {
      throw new ValidationError(
        'El usuario debe tener entre 3 y 32 caracteres: letras sin acentos, números, punto, guion o guion bajo.'
      );
    }
    if (!ROLES.includes(input.rol)) {
      throw new ValidationError('El tipo de cuenta no es válido.');
    }
    assertValidPassword(input.password);

    return this.accounts.create({
      username,
      passwordHash: await this.hasher.hash(input.password),
      rol: input.rol,
    });
  }
}
