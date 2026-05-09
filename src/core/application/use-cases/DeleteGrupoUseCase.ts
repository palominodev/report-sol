import { IGrupoRepository } from '@/core/domain/repositories/IGrupoRepository';

export class DeleteGrupoUseCase {
  constructor(private readonly grupoRepository: IGrupoRepository) {}

  async execute(id: number): Promise<void> {
    const count = await this.grupoRepository.countMembers(id);
    if (count > 0) {
      throw new Error(
        `No se puede eliminar el grupo porque tiene ${count} miembro${count !== 1 ? 's' : ''} asignado${count !== 1 ? 's' : ''}`
      );
    }
    await this.grupoRepository.delete(id);
  }
}
