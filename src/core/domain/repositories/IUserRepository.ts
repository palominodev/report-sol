import { User } from '@/domain/entities/User';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';

export interface CreateUserDTO {
  nombre: string;
  apellido: string;
  id_grupo: number;
  roles: string[];
  rol_en_grupo: string;
}

export interface UpdateUserDTO {
  nombre: string;
  apellido: string;
  id_grupo: number;
  roles: string[];
  rol_en_grupo: string;
}

export interface UserDetails {
  id_usuario: number;
  nombre: string;
  apellido: string;
  id_grupo: number | null;
  rol_en_grupo: string | null;
  roles: string | null;
}

export interface IUserRepository {
  create(data: CreateUserDTO): Promise<{ id_usuario: number }>;
  findById(id: number): Promise<User | null>;
  findByIdWithDetails(id: number): Promise<UserDetails | null>;
  findAllWithDetails(grupoId?: number): Promise<Record<string, unknown>[]>;
  update(id: number, data: UpdateUserDTO): Promise<void>;
  delete(id: number): Promise<void>;
  assignToGroup(userId: number, groupId: number, role: string): Promise<void>;
  findAllAssignable(): Promise<AssignablePerson[]>;
}
