import { IUserRepository, CreateUserDTO } from '@/core/domain/repositories/IUserRepository';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { validateAndNormalizeRoles } from '@/domain/entities/User';

export class CreateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: CreateUserDTO): Promise<{ id_usuario: number }> {
    if (!data.nombre || data.nombre.trim() === '' || !data.apellido || data.apellido.trim() === '') {
      throw new ValidationError('El nombre y apellido son requeridos');
    }

    if (!data.id_grupo || Number(data.id_grupo) <= 0) {
      throw new ValidationError('El grupo es requerido');
    }

    const normalizedRoles = validateAndNormalizeRoles(data.roles || []);

    return this.userRepository.create({
      ...data,
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      id_grupo: Number(data.id_grupo),
      roles: normalizedRoles,
      rol_en_grupo: data.rol_en_grupo || 'miembro',
    });
  }
}

