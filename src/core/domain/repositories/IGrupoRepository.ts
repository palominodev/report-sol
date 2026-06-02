import { Grupo } from '@/domain/entities/Grupo';

export interface GrupoDetails {
  id_grupo: number;
  nombre_grupo: string;
  encargado: string | null;
  auxiliar: string | null;
}

export interface IGrupoRepository {
  findAll(): Promise<Grupo[]>;
  findAllWithDetails(): Promise<GrupoDetails[]>;
  findById(id: number): Promise<Grupo | null>;
  create(nombre: string): Promise<Grupo>;
  delete(id: number): Promise<void>;
  countMembers(id: number): Promise<number>;
}
