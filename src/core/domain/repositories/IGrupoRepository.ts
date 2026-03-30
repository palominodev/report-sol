import { Grupo } from '@/domain/entities/Grupo';

export interface IGrupoRepository {
  findAll(): Promise<Grupo[]>;
  findAllWithDetails(): Promise<Record<string, unknown>[]>;
  findById(id: number): Promise<Grupo | null>;
}
