import { Grupo } from '@/domain/entities/Grupo';

export interface IGrupoRepository {
  findAll(): Promise<Grupo[]>;
  findAllWithDetails(): Promise<Record<string, unknown>[]>;
  findById(id: number): Promise<Grupo | null>;
  create(nombre: string): Promise<Grupo>;
  delete(id: number): Promise<void>;
  countMembers(id: number): Promise<number>;
}
