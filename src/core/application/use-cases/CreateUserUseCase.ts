import { IUserRepository, CreateUserDTO } from '@/core/domain/repositories/IUserRepository';

export class CreateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: CreateUserDTO): Promise<{ id_usuario: number }> {
    if (!data.nombre || !data.apellido) {
      throw new Error('El nombre y apellido son requeridos');
    }

    if (!data.id_grupo) {
      throw new Error('El grupo es requerido');
    }

    if (!data.roles || data.roles.length === 0) {
      throw new Error('Debe seleccionar al menos un rol');
    }

    return this.userRepository.create(data);
  }
}
