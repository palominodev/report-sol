import { IGrupoRepository, GrupoDetails } from '@/core/domain/repositories/IGrupoRepository';
import { Grupo } from '@/domain/entities/Grupo';

export class GetGruposUseCase {
  constructor(private grupoRepository: IGrupoRepository) {}

  async execute(): Promise<Grupo[]> {
    return this.grupoRepository.findAll();
  }

  async executeWithDetails(): Promise<GrupoDetails[]> {
    return this.grupoRepository.findAllWithDetails();
  }
}
