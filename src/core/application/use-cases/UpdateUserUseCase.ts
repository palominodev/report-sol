import { IUserRepository, UpdateUserDTO } from '@/core/domain/repositories/IUserRepository';

export class UpdateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(id: number, data: UpdateUserDTO): Promise<void> {
    if (!data.nombre || !data.apellido) {
      throw new Error('El nombre y apellido son requeridos');
    }

    if (!data.id_grupo) {
      throw new Error('El grupo es requerido');
    }

    if (!data.roles || data.roles.length === 0) {
      throw new Error('Debe seleccionar al menos un rol');
    }

    await this.userRepository.update(id, data);
  }
}
