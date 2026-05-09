import { IGrupoRepository } from '@/core/domain/repositories/IGrupoRepository';
import { Grupo } from '@/domain/entities/Grupo';

export class CreateGrupoUseCase {
  constructor(private readonly grupoRepository: IGrupoRepository) {}

  async execute(nombre: string): Promise<Grupo> {
    const trimmed = nombre.trim();
    if (!trimmed) {
      throw new Error('El nombre del grupo no puede estar vacío');
    }
    return this.grupoRepository.create(trimmed);
  }
}
